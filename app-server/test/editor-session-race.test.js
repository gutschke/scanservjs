/* eslint-env mocha */
/**
 * Regression test for the concurrent _assemblePages() race condition.
 *
 * Bug: _assemblePages() used fixed filenames (prepared-NNNN.pdf, assembled.pdf)
 * within the session directory. When assemblePreview() (triggered by switching
 * to view mode in DocumentDialog) and save() ran concurrently, the two calls
 * overwrote each other's intermediate files. This caused the merged output to
 * contain page content from the wrong source, while any rotation metadata was
 * still applied—producing pages that were rotated but showed a different page's
 * content.
 *
 * Fix: each _assemblePages() invocation now uses a random per-invocation ID
 * prefix for all intermediate files and cleans them up after use.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const EditorSession = require('../src/classes/editor-session');

// ---------------------------------------------------------------------------
// Minimal mock PDF tool.
//
// Each operation writes a deterministic text string to the output file so the
// test can verify that each _assemblePages() call assembled its own pages and
// not pages from a concurrent call.
//
// mergeDelay: ms to sleep inside mergePages() to widen the race window.
// ---------------------------------------------------------------------------
function makeMockPdfTool(mergeDelay = 0) {
  return {
    async getInfo(filePath) {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      const pages = text.split('\n').map(line => ({ width: 595, height: 842, label: line }));
      return { pages };
    },

    async extractPage(filePath, pageNum, outputPath) {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      const lines = text.split('\n');
      fs.writeFileSync(outputPath, lines[pageNum - 1] || `unknown-page-${pageNum}`);
    },

    async extractRotatePage(filePath, pageNum, degrees, outputPath) {
      const text = fs.readFileSync(filePath, 'utf8').trim();
      const lines = text.split('\n');
      const base = lines[pageNum - 1] || `unknown-page-${pageNum}`;
      fs.writeFileSync(outputPath, `${base}:r${degrees}`);
    },

    async createBlank(width, height, outputPath) {
      fs.writeFileSync(outputPath, `blank:${width}x${height}`);
    },

    async mergePages(inputPaths, outputPath) {
      // Read all inputs immediately (before any delay) to simulate a realistic
      // PDF library that maps/opens all files upfront.
      const contents = inputPaths.map(p => fs.readFileSync(p, 'utf8').trim());

      if (mergeDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, mergeDelay));
      }

      fs.writeFileSync(outputPath, contents.join('+'));
    },

    async placeOnPage(inputPath, w, h, fitMode, marginPts, outputPath) {
      const text = fs.readFileSync(inputPath, 'utf8').trim();
      fs.writeFileSync(outputPath, `${text}[${w}x${h}:${fitMode}]`);
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'editor-race-test-'));
}

function makeSourcePdf(dir, name, pages) {
  // Write a simple text "PDF" where each line is one page's content label
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, pages.join('\n'));
  return filePath;
}

/**
 * Build a minimal EditorSession from source files without going through the
 * full EditorSession.create() flow (which requires real PDF parsing).
 */
function buildSession(dir, config, pdfTool, pageSpecs) {
  const id = crypto.randomBytes(8).toString('hex');
  const sessionDir = path.join(config.tempDirectory, `editor-${id}`);
  fs.mkdirSync(path.join(sessionDir, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(sessionDir, 'thumbs'), { recursive: true });

  const pages = pageSpecs.map((p, i) => ({
    source: p.source,
    sourceType: 'pdf',
    pageNum: p.pageNum,
    width: 595,
    height: 842,
    _originalIndex: i
  }));

  return new EditorSession(id, sessionDir, pages, config, pdfTool);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditorSession._assemblePages() concurrency', function () {
  this.timeout(10000);

  let tmpDir, outputDir, tempDir, thumbDir, config;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    outputDir = path.join(tmpDir, 'output');
    tempDir = path.join(tmpDir, 'temp');
    thumbDir = path.join(tmpDir, 'thumbs');
    fs.mkdirSync(outputDir);
    fs.mkdirSync(tempDir);
    fs.mkdirSync(thumbDir);
    config = { outputDirectory: outputDir, tempDirectory: tempDir, thumbnailDirectory: thumbDir };
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('concurrent _assemblePages calls produce independent correct outputs', async () => {
    // Create two source PDFs, each with 4 pages
    makeSourcePdf(outputDir, 'fronts.pdf', ['F1', 'F2', 'F3', 'F4']);
    makeSourcePdf(outputDir, 'backs.pdf',  ['B1', 'B2', 'B3', 'B4']);

    // Use a 50 ms delay in mergePages so that a second concurrent call has
    // time to write its own prepared files while the first merge is "running".
    const pdfTool = makeMockPdfTool(50);
    const session = buildSession(tmpDir, config, pdfTool, []);

    // editList A: fronts interleaved with backs (reversed), F1 and F2 rotated
    const editListA = [
      { source: 'fronts.pdf', sourceType: 'pdf', pageNum: 1, rotation: 90, isBlank: false },
      { source: 'backs.pdf',  sourceType: 'pdf', pageNum: 4, rotation: 0,  isBlank: false },
      { source: 'fronts.pdf', sourceType: 'pdf', pageNum: 2, rotation: 90, isBlank: false },
      { source: 'backs.pdf',  sourceType: 'pdf', pageNum: 3, rotation: 0,  isBlank: false },
    ];

    // editList B: a different arrangement (simulates user changing order
    // between the preview call and the save call)
    const editListB = [
      { source: 'backs.pdf',  sourceType: 'pdf', pageNum: 1, rotation: 0,  isBlank: false },
      { source: 'fronts.pdf', sourceType: 'pdf', pageNum: 4, rotation: 0,  isBlank: false },
      { source: 'backs.pdf',  sourceType: 'pdf', pageNum: 2, rotation: 0,  isBlank: false },
      { source: 'fronts.pdf', sourceType: 'pdf', pageNum: 3, rotation: 90, isBlank: false },
    ];

    // Fire both concurrently — A is started first (like assemblePreview) and B
    // follows immediately (like save), both targeting the same session.
    const [pathA, pathB] = await Promise.all([
      session._assemblePages(editListA),
      session._assemblePages(editListB)
    ]);

    try {
      const resultA = fs.readFileSync(pathA, 'utf8');
      const resultB = fs.readFileSync(pathB, 'utf8');

      // A must contain exactly its own pages in order
      assert.strictEqual(resultA, 'F1:r90+B4+F2:r90+B3',
        `Call A produced wrong output: ${resultA}`);

      // B must contain exactly its own pages in order
      assert.strictEqual(resultB, 'B1+F4+B2+F3:r90',
        `Call B produced wrong output: ${resultB}`);

      // Cross-contamination check: A must not contain any page from B's editList
      // at positions where they differ (B1, F4 should not appear in A's output).
      assert.ok(!resultA.includes('B1'), `A output contaminated with B1: ${resultA}`);
      assert.ok(!resultA.includes('F4'), `A output contaminated with F4: ${resultA}`);

      // And B must not contain A's rotated-F1 or rotated-F2
      assert.ok(!resultB.includes('F1:r90'), `B output contaminated with F1:r90: ${resultB}`);
      assert.ok(!resultB.includes('F2:r90'), `B output contaminated with F2:r90: ${resultB}`);
    } finally {
      try { fs.unlinkSync(pathA); } catch (e) { /* ignore */ }
      try { fs.unlinkSync(pathB); } catch (e) { /* ignore */ }
    }
  });

  it('concurrent assemblePreview and save do not corrupt each other', async () => {
    makeSourcePdf(outputDir, 'scan1.pdf', ['P1', 'P2', 'P3', 'P4']);

    const pdfTool = makeMockPdfTool(30);
    const session = buildSession(tmpDir, config, pdfTool, []);

    const editListPreview = [
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 1, rotation: 90, isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 2, rotation: 0,  isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 3, rotation: 90, isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 4, rotation: 0,  isBlank: false },
    ];

    // Save editList is the same pages but different rotation (user changed
    // mind between switching to view and clicking save)
    const editListSave = [
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 1, rotation: 0,  isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 2, rotation: 90, isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 3, rotation: 0,  isBlank: false },
      { source: 'scan1.pdf', sourceType: 'pdf', pageNum: 4, rotation: 90, isBlank: false },
    ];

    // Run preview and save concurrently (preview starts first)
    const [previewPath, savePath] = await Promise.all([
      session.assemblePreview(editListPreview),
      session._assemblePages(editListSave)
    ]);

    try {
      const previewContent = fs.readFileSync(previewPath, 'utf8');
      const saveContent = fs.readFileSync(savePath, 'utf8');

      assert.strictEqual(previewContent, 'P1:r90+P2+P3:r90+P4',
        `Preview output wrong: ${previewContent}`);
      assert.strictEqual(saveContent, 'P1+P2:r90+P3+P4:r90',
        `Save output wrong: ${saveContent}`);
    } finally {
      try { fs.unlinkSync(savePath); } catch (e) { /* ignore */ }
    }
  });

  it('assembled temp files are cleaned up after use', async () => {
    makeSourcePdf(outputDir, 'doc.pdf', ['A', 'B']);

    const pdfTool = makeMockPdfTool(0);
    const session = buildSession(tmpDir, config, pdfTool, []);

    const editList = [
      { source: 'doc.pdf', sourceType: 'pdf', pageNum: 1, rotation: 0, isBlank: false },
      { source: 'doc.pdf', sourceType: 'pdf', pageNum: 2, rotation: 0, isBlank: false },
    ];

    const sessionDir = session.dir;
    const pagesDir = path.join(sessionDir, 'pages');

    // Before: no prepared files
    const before = fs.readdirSync(pagesDir).filter(f => f.startsWith('prepared-'));
    assert.strictEqual(before.length, 0, 'prepared files should not exist before assembly');

    const assembledPath = await session._assemblePages(editList);

    try {
      // Prepared files should have been cleaned up
      const after = fs.readdirSync(pagesDir).filter(f => f.startsWith('prepared-'));
      assert.strictEqual(after.length, 0,
        `prepared files should be cleaned up, but found: ${after.join(', ')}`);

      // Assembled file should still exist (caller's responsibility to delete)
      assert.ok(fs.existsSync(assembledPath),
        'assembled file should still exist for caller to use');
    } finally {
      try { fs.unlinkSync(assembledPath); } catch (e) { /* ignore */ }
    }
  });
});
