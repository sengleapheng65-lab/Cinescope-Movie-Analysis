# Oracle Cloud Always-On Deployment

These files prepare CineScope for an Ubuntu VM with a public IP address.

## 1. Install system packages

```bash
sudo apt update
sudo apt install -y python3-venv nginx git
git clone https://github.com/sengleapheng65-lab/Cinescope-Movie-Analysis.git
cd Cinescope-Movie-Analysis
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Configure the API token

```bash
sudo systemctl edit cinescope
```

Add:

```ini
[Service]
Environment=TMDB_API_TOKEN=your-token-here
```

Never commit the token to GitHub.

## 3. Install the service

Copy `cinescope.service` to `/etc/systemd/system/` and replace `/home/ubuntu/Cinescope-Movie-Analysis` with the actual repository path.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cinescope
sudo systemctl status cinescope
```

## 4. Configure Nginx

Copy `nginx.conf` to `/etc/nginx/sites-available/cinescope`, replace `example.com`, then enable it:

```bash
sudo ln -s /etc/nginx/sites-available/cinescope /etc/nginx/sites-enabled/cinescope
sudo nginx -t
sudo systemctl reload nginx
```

Point your domain's DNS A record to the VM public IP. Then enable HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```
