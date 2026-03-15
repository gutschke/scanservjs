# Reverse proxy

scanservjs supports reverse proxying and uses relative paths throughout so no
URL rewriting should be required.

## Apache

Example setup using a debian based distro.

```sh
sudo apt install apache2
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo nano /etc/apache2/sites-available/000-default.conf
```

Then add the following to a virtual host:

```
# Allow large file uploads (e.g., importing high-res multi-page PDFs)
LimitRequestBody 524288000

# Increase backend timeout for slow scan operations and large transfers
ProxyTimeout 300

<Location /scanner/>
  # flushpackets=on streams responses to the client as they arrive instead of
  # buffering the entire response in memory first. This is important on
  # memory-constrained devices.
  ProxyPass "http://127.0.0.1:8080/" flushpackets=on
  ProxyPassReverse "http://127.0.0.1:8080/"
</Location>
```

And restart

```sh
sudo systemctl restart apache2
```

## nginx

```sh
sudo apt install nginx
```

Edit your settings (e.g. `sudo nano /etc/nginx/sites-available/default`)

And add the following inside your chosen server block

```
  # Increase timeouts for slow scan operations and large file transfers
  proxy_read_timeout 300;
  proxy_connect_timeout 300;
  proxy_send_timeout 300;
  client_body_timeout 300;

  # Allow large file uploads (e.g., importing high-res multi-page PDFs)
  client_max_body_size 500m;

  location /scanner/ {
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_pass         http://127.0.0.1:8080/;

    # Stream responses to the client as they arrive without buffering to disk.
    # Without this, nginx writes large responses to a temp file before forwarding
    # them, which consumes significant memory on devices using a RAM-backed
    # (tmpfs) filesystem.
    proxy_buffering off;

    # Stream uploads to the backend without buffering to disk first.
    proxy_request_buffering off;
  }
```

Restart

```sh
sudo systemctl restart nginx
```

## Cloudflare

### Content Security Policy and the Cloudflare beacon

Cloudflare automatically injects an analytics beacon script
(`static.cloudflareinsights.com`) into HTML pages it proxies. scanservjs's
Content Security Policy already allows this script and its network connection
(`cloudflareinsights.com`), so no additional configuration is needed.
