# Troubleshooting Guide

## 1. Frontend page does not load

On Frontend EC2:

```bash
sudo systemctl status nginx
sudo nginx -t
sudo ss -lntp | grep 8080
curl -I http://localhost:8080/
```

Check the Frontend security group allows TCP 8080 from your client IP/CIDR. Check the public IP and URL.

## 2. Nginx returns 403 Forbidden

Nginx must be able to traverse `/opt` and read the frontend files:

```bash
namei -l /opt/expense-frontend/index.html
sudo find /opt/expense-frontend -type d -exec chmod 755 {} \;
sudo find /opt/expense-frontend -type f -exec chmod 644 {} \;
```

Check the Nginx error log:

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

## 3. API returns 502 Bad Gateway

A 502 usually means Nginx cannot reach the backend.

On Backend EC2:

```bash
sudo systemctl status expense-tracker
sudo ss -lntp | grep 5000
curl -i http://localhost:5000/api/expenses
```

On Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
```

Check the Backend security group allows TCP 5000 from the Frontend security group. Confirm `proxy_pass` points to the correct backend private IP.

## 4. Backend service fails to start

```bash
sudo systemctl status expense-tracker
sudo journalctl -u expense-tracker -n 100 --no-pager
sudo cat /var/log/expense-tracker/expense-tracker-error.log
```

Check:

- `server.js` exists in `/opt/expense-tracker`.
- `which node` matches the `ExecStart` path in the service.
- `.env` exists and contains correct values.
- `npm install` completed.
- `expenseapp` can read the project and `.env`.
- Port 5000 is not already occupied by another process.

After editing the unit file:

```bash
sudo systemctl daemon-reload
sudo systemctl restart expense-tracker
```

After editing application source:

```bash
sudo systemctl restart expense-tracker
```

## 5. Backend cannot connect to MySQL

On Backend EC2:

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

On Database EC2:

```bash
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

Check:

- Database host in backend `.env` is the DB private IP.
- MySQL is listening on the private interface.
- Database security group allows TCP 3306 from Backend SG.
- MySQL account host matches the backend private IP.
- Username, password, and database name are correct.

Do not expose the MySQL port publicly.

## 6. Logs

Backend application log:

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker.log
```

Backend service journal:

```bash
sudo journalctl -u expense-tracker -f
```

Nginx access log:

```bash
sudo tail -f /var/log/nginx/access.log
```

Nginx error log:

```bash
sudo tail -f /var/log/nginx/error.log
```

## 7. Service commands

```bash
sudo systemctl status SERVICE_NAME
sudo systemctl start SERVICE_NAME
sudo systemctl stop SERVICE_NAME
sudo systemctl restart SERVICE_NAME
sudo systemctl enable SERVICE_NAME
sudo systemctl disable SERVICE_NAME
sudo systemctl is-enabled SERVICE_NAME
```

For this project, service names are `nginx`, `expense-tracker`, and the optional `expense-frontend` marker service.
