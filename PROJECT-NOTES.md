# Project Notes and Accuracy

1. This package reflects the latest deployed Node.js + Express + MySQL version, not the older Spring Boot experiment.
2. The frontend JavaScript uses `const API_URL = '/api/expenses'`; Nginx handles the proxy to the backend.
3. The currently deployed API supports GET and POST `/api/expenses`.
4. The backend private IP in the Nginx sample is the lab's recorded `172.31.47.69`; update it if it changes.
5. The database private IP in `.env.example` is intentionally a placeholder; the lab used `172.31.35.119`.
6. The Frontend EC2's Nginx worker normally runs as `www-data` on Ubuntu. Static files owned by `frontendapp` with directory mode 755 and file mode 644 remain readable by Nginx.
7. The `expense-frontend.service` is a oneshot marker (`/usr/bin/true`) matching the lab configuration. It is not the web server. `nginx.service` is the actual long-running server and must be enabled.
8. The backend log middleware logs completed requests to stdout; systemd's `StandardOutput=append:` sends those lines to `/var/log/expense-tracker/expense-tracker.log`.
9. `dotenv` informational startup output may appear in the error log depending on package version/output stream; it is not automatically an application failure.
10. Custom Nginx log files under `/var/log/expense-frontend/` are not configured. Use `/var/log/nginx/access.log` and `/var/log/nginx/error.log` for Nginx request/error logs for now.
11. Never put live database credentials in Git. Copy `.env.example` to `.env` on the backend host and set a private password there.
12. The `CREATE USER` command in the deployment guide must use the actual backend private IP as the MySQL account host.
