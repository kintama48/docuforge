# Stag TLS certificates

Drop the wildcard cert files here after issuing them via certbot:
- `fullchain.pem`
- `privkey.pem`

Issue via certbot DNS-01 (recommended, since wildcard) once Cloudflare DNS is set up:

```
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.stag.docuforge.app" \
  -d "stag.docuforge.app"
```

Or via HTTP-01 for non-wildcard subdomains once DNS propagates and stag subdomains route to the droplet.

After dropping the files in, uncomment the stag server blocks in `../nginx.conf` and reload nginx:

```
docker exec docuforge-nginx-1 nginx -s reload
```
