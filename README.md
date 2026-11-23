# Expense Tracker – AWS Three-Tier Deployment

A beginner-friendly, end-to-end guide for deploying an Expense Tracker application on **three Ubuntu EC2 instances** using Nginx, Node.js/Express, and MySQL.

Follow the steps in order. Each command is labelled with the server on which it must run. Complete the verification step in each section before moving to the next one.

> **Deployment model:** Frontend EC2 → Backend EC2 → Database EC2  
> **Domain setup:** Domain registered with Hostinger and DNS hosted in Amazon Route 53.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Architecture and request flow](#2-architecture-and-request-flow)
3. [Technology stack and project structure](#3-technology-stack-and-project-structure)
4. [Prerequisites and deployment values](#4-prerequisites-and-deployment-values)
5. [Create the AWS security groups](#5-create-the-aws-security-groups)
6. [Launch the EC2 instances](#6-launch-the-ec2-instances)
7. [Connect to the EC2 instances](#7-connect-to-the-ec2-instances)
8. [Configure the MySQL database server](#8-configure-the-mysql-database-server)
9. [Configure and deploy the Node.js backend](#9-configure-and-deploy-the-nodejs-backend)
10. [Configure and deploy the frontend with Nginx](#10-configure-and-deploy-the-frontend-with-nginx)
11. [Purchase the domain and configure DNS with Hostinger and Route 53](#11-purchase-the-domain-and-configure-dns-with-hostinger-and-route-53)
    - [Purchase/register the domain in Hostinger](#111-purchaseregister-the-domain-in-hostinger)
    - [Understand the DNS request flow](#112-understand-the-dns-request-flow)
    - [Create a public hosted zone in Route 53](#113-create-a-route-53-public-hosted-zone)
    - [Copy Route 53 nameservers and update Hostinger](#114-copy-route-53-nameservers-and-update-hostinger)
    - [Create the root-domain A record pointing to Frontend EC2](#115-create-the-root-domain-a-record-pointing-to-frontend-ec2)
    - [Create the www CNAME record](#116-create-the-www-cname-record)
    - [Verify DNS records and propagation](#117-verify-dns-records-and-propagation)
    - [Test the domain and API](#118-test-the-domain-and-api)
12. [Start and enable the services](#12-start-and-enable-the-services)
13. [Test the complete application](#13-test-the-complete-application)
14. [Verify the database records](#14-verify-the-database-records)
15. [Application and server logs](#15-application-and-server-logs)
16. [Reboot and automatic-startup verification](#16-reboot-and-automatic-startup-verification)
17. [Security recommendations](#17-security-recommendations)
18. [Troubleshooting](#18-troubleshooting)
19. [Final deployment checklist](#19-final-deployment-checklist)
20. [Useful commands reference](#20-useful-commands-reference)
21. [Project scope and limitations](#21-project-scope-and-limitations)

---

## 1. Project overview

This project deploys an Expense Tracker application on three Ubuntu EC2 instances in AWS.

| Tier | EC2 instance | Technology | Responsibility |
|---|---|---|---|
| Presentation | Frontend EC2 | HTML, CSS, JavaScript, Nginx | Displays the application in the browser |
| Application | Backend EC2 | Node.js, Express.js | Handles API requests and application logic |
| Data | Database EC2 | MySQL | Stores expense records |

### Application capabilities

- Create a new expense.
- Retrieve and display saved expenses.
- Update an existing expense.
- Delete an expense.
- Store expense information in MySQL.
- Serve static frontend files through Nginx.
- Forward API requests to the backend through an Nginx reverse proxy.
- Run the backend as a Linux `systemd` service.
- Start Nginx, the backend and MySQL automatically after an EC2 reboot.
- Record backend application logs and Nginx access/error logs.
- Access the application through the frontend EC2 public IP or a custom domain.

### Expense data model

| Field | Description |
|---|---|
| `id` | Automatically generated expense ID |
| `title` | Expense title |
| `amount` | Expense amount |
| `category` | Expense category |
| `expense_date` | Date of the expense |
| `description` | Optional description |
| `created_at` | Record creation timestamp |

### CRUD API operations

CRUD means **Create, Read, Update and Delete**.

| Operation | HTTP method | Endpoint | Purpose |
|---|---|---|---|
| Create | `POST` | `/api/expenses` | Add an expense |
| Read | `GET` | `/api/expenses` | Retrieve expenses |
| Update | `PUT` | `/api/expenses/:id` | Update an expense |
| Delete | `DELETE` | `/api/expenses/:id` | Delete an expense |

---

## 2. Architecture and request flow

The application uses a three-tier architecture. The frontend, backend and database run on separate EC2 instances in the same VPC.

### 2.1 Architecture diagram

```text
                         USER'S BROWSER
                               |
                 +-------------+-------------+
                 |                           |
            Domain access               Direct IP access
          http://devcloud.store       http://PUBLIC-IP:8080
                 |                           |
                 v                           v
          AMAZON ROUTE 53              FRONTEND EC2
          DNS resolution                NGINX :8080
                 |                           |
                 v                           |
            FRONTEND EC2 <-------------------+
              NGINX :80
                 |
          Serves HTML, CSS
           and JavaScript
                 |
          Browser calls API
            /api/expenses
                 |
                 v
          NGINX REVERSE PROXY
                 |
          Private VPC network
          Backend private IP:5000
                 |
                 v
             BACKEND EC2
          Node.js + Express
                 |
          Processes CRUD API
                 |
          Private VPC network
          Database private IP:3306
                 |
                 v
            DATABASE EC2
                MySQL
                 |
           expense_tracker
                 |
            expenses table
```

### 2.2 Request flow

1. A user opens the application using the domain or frontend EC2 public IP.
2. For domain access, Route 53 resolves the domain to the frontend public IP.
3. Nginx receives the HTTP request.
4. Nginx serves the frontend HTML, CSS and JavaScript files.
5. The browser sends API requests to the relative path `/api/expenses`.
6. Nginx forwards API requests to the backend private IP on port `5000`.
7. Express.js processes the request.
8. The backend communicates with MySQL on port `3306`.
9. MySQL performs the requested database operation.
10. The response returns through the backend and Nginx to the browser.

**Important:** The browser does not connect directly to the backend private IP or database. The browser calls the frontend's `/api/expenses` path. Nginx forwards that request to the backend over the VPC private network.

### 2.3 Application URLs

| Access method | URL | Purpose |
|---|---|---|
| Root domain | `http://devcloud.store` | Main application URL |
| WWW domain | `http://www.devcloud.store` | Alternative domain URL |
| Direct public IP | `http://FRONTEND_PUBLIC_IP:8080` | Direct frontend access |
| Backend API | `http://BACKEND_PRIVATE_IP:5000/api/expenses` | Private backend endpoint |

The domain uses HTTP port `80`. The direct IP test uses port `8080`.

### 2.4 Network ports

| Port | Protocol | Source | Destination | Purpose |
|---:|---|---|---|---|
| 22 | TCP | Your public IP `/32` or approved admin path | EC2 instances | SSH administration |
| 80 | TCP | Public internet | Frontend EC2 | HTTP domain access |
| 443 | TCP | Public internet | Frontend EC2 | HTTPS, when configured |
| 8080 | TCP | Your permitted client IP | Frontend EC2 | Direct IP testing |
| 5000 | TCP | Frontend security group | Backend EC2 | Node.js API |
| 3306 | TCP | Backend security group | Database EC2 | MySQL |

> Never expose backend port `5000` or database port `3306` to the public internet.

---

## 3. Technology stack and project structure

### 3.1 Technology stack

- **AWS EC2:** Compute for the three application tiers.
- **Ubuntu Server:** Operating system on the EC2 instances.
- **Nginx:** Static web server and reverse proxy.
- **HTML, CSS and JavaScript:** Frontend.
- **Node.js and Express.js:** Backend API.
- **MySQL:** Relational database.
- **systemd:** Backend process management and automatic startup.
- **Amazon Route 53:** DNS hosting.
- **Hostinger:** Domain registrar for `devcloud.store`.

### 3.2 Repository structure

The repository is expected to follow this structure:

```text
expense-tracker-aws-three-tier/
├── README.md
├── README-DEPLOYMENT.md
├── README-TROUBLESHOOTING.md
├── PROJECT-NOTES.md
├── .gitignore
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── expenseController.js
│   └── routes/
│       └── expenseRoutes.js
│
├── database/
│   └── schema.sql
│
└── deploy/
    ├── nginx/
    │   └── expense-tracker.conf
    ├── systemd/
    │   ├── expense-tracker.service
    │   └── expense-frontend.service
    └── scripts/
        └── create-backend-user-and-directories.sh
```

### 3.3 Important files

| File | Responsibility |
|---|---|
| `frontend/index.html` | Page structure and expense form |
| `frontend/style.css` | Application design and layout |
| `frontend/script.js` | Calls the backend API and updates the page |
| `backend/server.js` | Starts Express and registers middleware/routes |
| `backend/config/db.js` | Creates the MySQL connection |
| `backend/controllers/expenseController.js` | Implements expense CRUD operations |
| `backend/routes/expenseRoutes.js` | Maps API paths to controller functions |
| `backend/.env.example` | Template for backend environment variables |
| `database/schema.sql` | Creates the expenses table |
| `deploy/nginx/expense-tracker.conf` | Nginx configuration template |
| `deploy/systemd/expense-tracker.service` | Runs the backend through systemd |
| `deploy/systemd/expense-frontend.service` | Optional frontend marker service for this lab |

The live Nginx configuration may use separate files for ports `80` and `8080`. Keep repository configuration templates consistent with the actual server configuration.

---

## 4. Prerequisites and deployment values

### 4.1 Prerequisites

Before starting, make sure you have:

- An AWS account with permission to create VPC resources, security groups, key pairs, EC2 instances and Route 53 hosted zones.
- A Hostinger account with the domain `devcloud.store`.
- An SSH client. Windows 10/11 usually includes OpenSSH in PowerShell.
- The project repository or ZIP file available on your computer.
- An EC2 key pair and its `.pem` private key.
- Your current public IPv4 address, to restrict SSH access.
- Three Ubuntu EC2 instances in the same VPC, with private network connectivity.
- A Route 53 public hosted zone for `devcloud.store`.

### 4.2 Security note

Never share or commit any of the following:

- `.pem` private keys.
- Database passwords.
- AWS access keys or secret keys.
- Your real backend `.env` file.
- Any other production credentials.

Use `.gitignore` to exclude secret files from Git.

### 4.3 Record your AWS environment

Fill in this table after creating the infrastructure.

| Value | Your environment |
|---|---|
| AWS Region | `YOUR_AWS_REGION` |
| VPC ID | `YOUR_VPC_ID` |
| Frontend public IPv4 | `FRONTEND_PUBLIC_IP` |
| Frontend private IPv4 | `FRONTEND_PRIVATE_IP` |
| Backend private IPv4 | `BACKEND_PRIVATE_IP` |
| Database private IPv4 | `DATABASE_PRIVATE_IP` |
| Domain | `devcloud.store` |
| WWW domain | `www.devcloud.store` |
| Your public IPv4 CIDR | `YOUR_PUBLIC_IP/32` |

The original lab recorded these example private addresses:

| Server | Example private IP |
|---|---|
| Frontend | `172.31.32.210` |
| Backend | `172.31.47.69` |
| Database | `172.31.35.119` |

These are **reference values only**. Use the actual private IP addresses displayed in your EC2 console. They may change if you recreate the instances.

The original lab also recorded `54.152.118.78` as the frontend public IP. Do not assume it is still assigned to your instance. Check the EC2 console before using it.

### 4.4 Plan the EC2 configuration

For a learning lab, a small Ubuntu instance may be sufficient. Choose an instance type and EBS size appropriate to your workload, region and budget. Check current AWS pricing before launching.

For all three instances:

- AMI: Ubuntu Server LTS.
- Architecture: Prefer the same architecture across the instances.
- Key pair: Select your SSH key pair.
- VPC: Select the same VPC for all three instances.
- Storage: Configure an appropriate EBS volume.
- Network access: The frontend needs a public endpoint for browser access. The backend and database do not need public inbound application ports.

For a hardened design, prefer private instances with administration through Systems Manager Session Manager, a VPN or a controlled bastion host rather than public SSH.

---

## 5. Create the AWS security groups

Create three security groups in the same VPC.

### 5.1 Frontend security group

Example name: `frontend_security_group`

Configure these inbound rules:

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | `YOUR_PUBLIC_IP/32` |
| HTTP | TCP | 80 | `0.0.0.0/0` |
| Custom TCP | TCP | 8080 | `YOUR_PUBLIC_IP/32` |
| HTTPS | TCP | 443 | `0.0.0.0/0` when HTTPS is configured |

Port `80` allows users to access the domain. Port `8080` is for direct IP testing.

If IPv6 is enabled and the application should be reachable over IPv6, configure the corresponding IPv6 rules as well.

### 5.2 Backend security group

Example name: `expense-backend-sg`

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | Your public IP `/32` or approved administration method |
| Custom TCP | TCP | 5000 | Frontend security group |

For port `5000`, select the **frontend security group** as the source. Do not use `0.0.0.0/0`.

### 5.3 Database security group

Example name: `expense-database-sg`

| Type | Protocol | Port | Source |
|---|---|---:|---|
| SSH | TCP | 22 | Your public IP `/32` or approved administration method |
| MySQL/Aurora | TCP | 3306 | Backend security group |

For port `3306`, select the **backend security group** as the source.

### 5.4 Verify the security group rules

Before launching or configuring the instances, verify:

- Frontend port `80` is reachable publicly for domain HTTP access.
- Frontend port `8080` is reachable only from your permitted client IP.
- Frontend port `443` is allowed when HTTPS is configured.
- Backend port `5000` accepts traffic only from the frontend security group.
- Database port `3306` accepts traffic only from the backend security group.
- SSH port `22` is restricted to your public IP `/32` or an approved private access method.
- No unnecessary public MySQL, backend or all-traffic rules exist.

Security groups are stateful. Return traffic for permitted connections is automatically allowed.

---

## 6. Launch the EC2 instances

Launch these three Ubuntu instances:

1. `Expense-Frontend`
2. `Expense-Backend`
3. `Expense-Database`

For each instance:

1. Open the AWS EC2 console.
2. Select **Launch instance**.
3. Enter the instance name.
4. Select an Ubuntu Server LTS AMI.
5. Choose an instance type.
6. Select your key pair.
7. Select the intended VPC and subnet.
8. Attach the correct security group.
9. Configure EBS storage.
10. Launch the instance.

### 6.1 Attach the correct security groups

| EC2 instance | Security group |
|---|---|
| `Expense-Frontend` | Frontend security group |
| `Expense-Backend` | Backend security group |
| `Expense-Database` | Database security group |

After launch, record each instance's private IPv4 address. Also record the frontend public IPv4 address if one is assigned.

**Verification:** Do not continue until all three instances are running and their private IP addresses are recorded.

---

## 7. Connect to the EC2 instances

The following examples use Windows PowerShell. Replace the key path and IP placeholders with your own values.

### 7.1 Connect to Frontend EC2

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@FRONTEND_PUBLIC_IP
```

### 7.2 Connect to Backend and Database EC2

If these instances have reachable public IPs, connect using:

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@BACKEND_PUBLIC_IP
ssh -i "C:\path\to\your-key.pem" ubuntu@DATABASE_PUBLIC_IP
```

For private-only instances, connect through your approved method, such as a bastion host, VPN or AWS Systems Manager Session Manager.

On Linux/macOS, restrict the private key permissions if required:

```bash
chmod 400 /path/to/your-key.pem
```

### 7.3 Verify the connected server

Run this after connecting to each instance:

```bash
hostname
hostname -I
```

Make sure you are on the correct server before running the commands in the following sections. Do not run database commands on the frontend instance.

---

## 8. Configure the MySQL database server

> **Run every command in this section on: Database EC2.**

### 8.1 Update Ubuntu and install MySQL

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y mysql-server
```

Enable and start MySQL:

```bash
sudo systemctl enable --now mysql
sudo systemctl status mysql
```

Expected status: `active (running)`.

### 8.2 Configure MySQL network listening

Open the MySQL server configuration:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Find `bind-address` and set it to the database instance's private IP:

```ini
bind-address = DATABASE_PRIVATE_IP
```

Replace `DATABASE_PRIVATE_IP` with the actual private IP of Database EC2. If a suitable private bind address is already configured, do not add a duplicate setting.

Restart MySQL and verify the listener:

```bash
sudo systemctl restart mysql
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

The listener should use the database private address and port `3306`. Avoid binding to all interfaces unless you have a specific reason and have verified the network controls.

### 8.3 Create the database and application user

Open the local MySQL shell:

```bash
sudo mysql
```

Run the following SQL. Replace `BACKEND_PRIVATE_IP` with the actual private IP of Backend EC2. Replace the sample password with a strong, unique password.

```sql
CREATE DATABASE expense_tracker;

CREATE USER 'expense_user'@'BACKEND_PRIVATE_IP'
IDENTIFIED BY 'REPLACE_WITH_YOUR_OWN_STRONG_PASSWORD';

GRANT SELECT, INSERT, UPDATE, DELETE
ON expense_tracker.*
TO 'expense_user'@'BACKEND_PRIVATE_IP';

FLUSH PRIVILEGES;
```

The `BACKEND_PRIVATE_IP` text is a placeholder; do not run it literally. For example, if the backend private IP is `172.31.47.69`, the account host should be `'172.31.47.69'`.

The MySQL account is restricted to connections from the backend IP. The database security group separately restricts network access to the backend security group.

### 8.4 Create the expenses table

You can execute the SQL in `database/schema.sql`, or run:

```sql
USE expense_tracker;

CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Verify the database and table:

```sql
SHOW DATABASES;
USE expense_tracker;
SHOW TABLES;
DESCRIBE expenses;
EXIT;
```

Expected table name: `expenses`.

### 8.5 Verify MySQL automatic startup

```bash
sudo systemctl is-enabled mysql
```

Expected result:

```text
enabled
```

**Verification before moving on:** MySQL must be active, enabled, listening on the database private IP at port `3306`, and the `expense_tracker.expenses` table must exist.

---

## 9. Configure and deploy the Node.js backend

> **Run every command in this section on: Backend EC2.**

### 9.1 Update Ubuntu and install Node.js tools and MySQL client

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nodejs npm mysql-client
```

Check the installed versions:

```bash
node --version
npm --version
mysql --version
```

If `mysql-client` is not available for your Ubuntu release, install the MySQL client package provided by that release, such as `mysql-client-core` or its distribution equivalent.

### 9.2 Test the private connection to MySQL

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

Replace `DATABASE_PRIVATE_IP` with the actual database private IP. Enter the database password when prompted.

At the MySQL prompt:

```sql
SHOW TABLES;
SELECT * FROM expenses;
EXIT;
```

If the connection fails, stop here. Check the MySQL bind address, MySQL user host, database security group and private IP before configuring the Node.js service.

### 9.3 Create the backend application directory

The application will be installed at:

```text
/opt/expense-tracker
```

Create the directory:

```bash
sudo mkdir -p /opt/expense-tracker
```

Copy the contents of the repository's `backend/` directory into `/opt/expense-tracker`.

The resulting layout must be:

```text
/opt/expense-tracker/
├── server.js
├── package.json
├── config/
│   └── db.js
├── controllers/
│   └── expenseController.js
└── routes/
    └── expenseRoutes.js
```

Transfer files using SCP, a private Git repository, SFTP or another secure method. Do not copy your real `.env` file into a public repository.

### 9.4 Create the backend environment file

```bash
sudo nano /opt/expense-tracker/.env
```

Add the following values and replace the database IP and password:

```dotenv
PORT=5000
DB_HOST=DATABASE_PRIVATE_IP
DB_USER=expense_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=expense_tracker
DB_PORT=3306
```

Protect the file:

```bash
sudo chmod 600 /opt/expense-tracker/.env
```

The file will later be owned by the restricted application user. Do not print its contents in terminal screenshots or share it.

### 9.5 Install Node.js dependencies

```bash
cd /opt/expense-tracker
sudo npm install --omit=dev
```

Verify the application files and dependencies:

```bash
ls -la
```

### 9.6 Optional manual backend test

Before creating the systemd service, you can test the backend manually:

```bash
cd /opt/expense-tracker
sudo node server.js
```

If the configuration is correct, the application should report that the server is listening on port `5000` and that MySQL connected successfully.

Open another terminal session to Backend EC2 and test:

```bash
curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

Stop the manually started process with `Ctrl+C` before continuing. The systemd service will manage the process later.

### 9.7 Create a restricted Linux service user

The backend should not run as root.

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-tracker \
  --no-create-home \
  --shell /usr/sbin/nologin expenseapp
```

If the user already exists, do not create it again. Check it with:

```bash
id expenseapp
```

Set ownership and permissions:

```bash
sudo chown -R expenseapp:expenseapp /opt/expense-tracker
sudo chmod 750 /opt/expense-tracker
sudo chmod 600 /opt/expense-tracker/.env
```

### 9.8 Create backend log files

```bash
sudo mkdir -p /var/log/expense-tracker

sudo touch /var/log/expense-tracker/expense-tracker.log
sudo touch /var/log/expense-tracker/expense-tracker-error.log

sudo chown -R expenseapp:expenseapp /var/log/expense-tracker
sudo chmod 750 /var/log/expense-tracker
sudo chmod 640 /var/log/expense-tracker/*.log
```

### 9.9 Configure the backend systemd service

Create the service file:

```bash
sudo nano /etc/systemd/system/expense-tracker.service
```

Add:

```ini
[Unit]
Description=Expense Tracker Node.js Backend
After=network.target

[Service]
Type=simple
User=expenseapp
Group=expenseapp
WorkingDirectory=/opt/expense-tracker
ExecStart=/usr/bin/node /opt/expense-tracker/server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/expense-tracker/.env
StandardOutput=append:/var/log/expense-tracker/expense-tracker.log
StandardError=append:/var/log/expense-tracker/expense-tracker-error.log

[Install]
WantedBy=multi-user.target
```

Check the Node.js binary path:

```bash
which node
```

If the returned path is not `/usr/bin/node`, update `ExecStart` to use the path returned by `which node`.

Reload systemd and enable/start the backend:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-tracker
```

Check the service:

```bash
sudo systemctl status expense-tracker
```

Expected status:

```text
Active: active (running)
```

Verify that the backend is listening on port `5000`:

```bash
sudo ss -lntp | grep 5000
```

The backend should be reachable from the frontend over private networking, not directly from the public internet.

### 9.10 Backend CRUD endpoints

| HTTP method | Endpoint | Operation |
|---|---|---|
| `GET` | `/api/expenses` | Retrieve all expenses |
| `POST` | `/api/expenses` | Create an expense |
| `PUT` | `/api/expenses/:id` | Update an expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |

The route file maps these endpoints to the appropriate controller functions. For example:

```javascript
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);
```

The controller handles the corresponding database operations. The exact request body and validation rules depend on the application implementation. Use the field names expected by your controller and frontend.

**Verification before moving on:** The backend service must be active, port `5000` must be listening, and the backend must be able to connect to MySQL.

---

## 10. Configure and deploy the frontend with Nginx

> **Run every command in this section on: Frontend EC2.**

### 10.1 Update Ubuntu and install Nginx

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx
```

Enable and start Nginx:

```bash
sudo systemctl enable --now nginx
sudo systemctl status nginx
```

Expected status: `active (running)`.

### 10.2 Create the frontend application user

Nginx serves static files. Create a dedicated owner for the project files:

```bash
sudo useradd --system --user-group \
  --home-dir /opt/expense-frontend \
  --no-create-home \
  --shell /usr/sbin/nologin frontendapp
```

If the user already exists, verify it:

```bash
id frontendapp
```

### 10.3 Create the frontend directory and deploy files

```bash
sudo mkdir -p /opt/expense-frontend
```

Copy the contents of the repository's `frontend/` directory into `/opt/expense-frontend`.

The final layout must be:

```text
/opt/expense-frontend/
├── index.html
├── style.css
└── script.js
```

Set ownership and permissions:

```bash
sudo chown -R frontendapp:frontendapp /opt/expense-frontend

sudo find /opt/expense-frontend -type d -exec chmod 755 {} \;
sudo find /opt/expense-frontend -type f -exec chmod 644 {} \;
```

Nginx must be able to read the files and traverse the directories.

### 10.4 Configure Nginx for direct IP access on port 8080

Create the Nginx configuration:

```bash
sudo nano /etc/nginx/conf.d/expense-tracker.conf
```

Add the following configuration. Replace `BACKEND_PRIVATE_IP` with the actual private IP of Backend EC2.

```nginx
server {
    listen 8080;
    server_name _;

    root /opt/expense-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://BACKEND_PRIVATE_IP:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Do not leave `BACKEND_PRIVATE_IP` as a literal placeholder in the live Nginx configuration.

Test the configuration:

```bash
sudo nginx -t
```

Continue only if Nginx reports that the syntax is OK and the test is successful.

Reload Nginx:

```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

Test the local frontend:

```bash
curl -I http://localhost:8080/
```

A successful response should show HTTP `200`.

### 10.5 Understand the Nginx reverse proxy

The frontend JavaScript uses a relative API path:

```text
/api/expenses
```

Nginx receives this request and forwards it to:

```text
http://BACKEND_PRIVATE_IP:5000/api/expenses
```

This keeps the backend private IP out of the browser code and avoids exposing port `5000` to users' browsers.

### 10.6 Configure Nginx for the custom domain on port 80

The custom domain uses an additional Nginx server configuration.

Create the file:

```bash
sudo nano /etc/nginx/conf.d/expense-tracker-port80.conf
```

Add the following, replacing `BACKEND_PRIVATE_IP` with the actual backend private IP:

```nginx
server {
    listen 80;
    server_name devcloud.store www.devcloud.store;

    root /opt/expense-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://BACKEND_PRIVATE_IP:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Important notes:

- This configuration listens on port `80` for `devcloud.store` and `www.devcloud.store`.
- It serves the same frontend directory: `/opt/expense-frontend`.
- It forwards API requests to the backend private IP on port `5000`.
- The existing port `8080` configuration remains available for direct IP access.
- Do not add `default_server` if another active configuration already declares itself as the default server on port `80`.
- Do not delete or modify `/etc/nginx/sites-enabled/default` without first checking how Nginx currently uses it.

Validate all active Nginx configurations:

```bash
sudo nginx -t
```

Inspect the complete configuration:

```bash
sudo nginx -T
```

Inspect server blocks and proxy settings:

```bash
sudo nginx -T | grep -n -B 10 -A 20 -E 'listen 8080|listen 80|server_name|proxy_pass'
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

Test both local listeners:

```bash
curl -I http://localhost:8080/
curl -I http://localhost/
```

Both should serve the frontend successfully.

### 10.7 Confirm both Nginx configurations use the same frontend directory

Both server blocks should contain:

```nginx
root /opt/expense-frontend;
```

This ensures that direct IP access and domain access serve the same frontend files. If one URL displays a different design, inspect the active Nginx server blocks and document roots.

**Verification before moving on:** `nginx -t` must pass, Nginx must be active, and both ports `80` and `8080` must serve the expected frontend.

---

## 11. Purchase the domain and configure DNS with Hostinger and Route 53

This section starts with domain registration, then delegates DNS authority to Route 53, creates the DNS records, and finally connects the domain to the public IP address of the Frontend EC2 instance.

### 11.1 Purchase/register the domain in Hostinger

1. Sign in to your Hostinger account.
2. Open the domain search/registration page.
3. Search for the domain name you want to use, such as `devcloud.store`.
4. Check availability and complete the domain registration/purchase.
5. Confirm that the domain appears in your Hostinger domain management dashboard.

> If you already own the domain, do not purchase it again. Continue with the Route 53 hosted-zone setup.

This project uses:

- **Hostinger:** Domain registrar where `devcloud.store` was purchased.
- **Amazon Route 53:** DNS hosting service.
- **Frontend EC2:** Destination for domain traffic.
- **Nginx:** Web server that receives domain requests.

### 11.2 Understand the DNS request flow

```text
           USER'S BROWSER
                 |
           devcloud.store
                 |
                 v
       HOSTINGER DOMAIN REGISTRATION
                 |
        Nameservers delegated to
             Route 53
                 |
                 v
          AMAZON ROUTE 53
           PUBLIC HOSTED ZONE
                 |
             A record
                 |
                 v
            FRONTEND EC2
              PUBLIC IP
                 |
               NGINX
              PORT 80
                 |
          +------+------+
          |             |
     Frontend files   /api/ requests
                          |
                          v
                      Backend EC2
```

### 11.3 Create a Route 53 public hosted zone

1. Sign in to the AWS Management Console.
2. Open **Route 53**.
3. Select **Hosted zones**.
4. Choose **Create hosted zone**.
5. Enter `devcloud.store`.
6. Select **Public hosted zone**.
7. Create the hosted zone.

Route 53 automatically creates an NS record and an SOA record. The NS record contains four Route 53 nameservers. These nameservers must be configured at the domain registrar.

### 11.4 Copy Route 53 nameservers and update Hostinger

Route 53 becomes authoritative for the domain only after the registrar delegates the domain to the Route 53 nameservers.

1. Log in to Hostinger.
2. Open the domain management section.
3. Select `devcloud.store`.
4. Find the nameserver settings.
5. Select the option to use custom nameservers.
6. Copy all four NS values from the Route 53 hosted zone.
7. Enter those four nameservers in Hostinger.
8. Save the changes.

Example format only:

```text
ns-XXXX.awsdns-XX.com
ns-XXXX.awsdns-XX.net
ns-XXXX.awsdns-XX.org
ns-XXXX.awsdns-XX.co.uk
```

Use the exact four nameservers generated by your own Route 53 hosted zone. Do not use the example values above.

Wait for the nameserver change to propagate.

> Creating DNS records in Route 53 is not sufficient by itself. The domain registrar must delegate the domain to the Route 53 nameservers.

### 11.5 Create the root-domain A record pointing to Frontend EC2

Inside the `devcloud.store` hosted zone:

1. Choose **Create record**.
2. Leave the record name blank for the root domain.
3. Select record type `A`.
4. Enter the frontend EC2 public IPv4 address.
5. Select Simple routing.
6. Save the record.

Example configuration:

| Field | Value |
|---|---|
| Domain | `devcloud.store` |
| Record type | `A` |
| Destination | `FRONTEND_PUBLIC_IP` |
| Routing policy | Simple |

The original lab recorded `54.152.118.78`; verify the current EC2 public IP before using it.

**Important:** The A record must point to the **public IPv4 address of the Frontend EC2 instance running Nginx**. Do not point it to the Backend EC2 or Database EC2. User browser traffic reaches Nginx on the frontend server first; Nginx then serves the website and proxies `/api/` requests to the backend over the private network.

For a stable setup, associate an Elastic IP with Frontend EC2 and use that address in the A record. If the public IP changes, update the DNS record.

### 11.6 Create the www CNAME record

Create another record in the same hosted zone:

| Field | Value |
|---|---|
| Record name | `www` |
| Record type | `CNAME` |
| Destination | `devcloud.store` |
| Routing policy | Simple |

This makes both hostnames available:

- `devcloud.store`
- `www.devcloud.store`

### 11.7 Understand the DNS record types

| Record type | Purpose |
|---|---|
| A | Maps a domain name to an IPv4 address |
| AAAA | Maps a domain name to an IPv6 address |
| CNAME | Maps one domain name to another domain name |
| NS | Identifies the authoritative nameservers |
| SOA | Contains DNS zone authority information |

For this project:

- The A record points the root domain to the frontend public IPv4 address.
- The `www` CNAME points to `devcloud.store`.
- NS and SOA records are created automatically by Route 53.

### 11.8 Verify DNS records and propagation

From your local computer:

```bash
nslookup devcloud.store
nslookup www.devcloud.store
```

You can also use:

```bash
dig devcloud.store
dig www.devcloud.store
dig NS devcloud.store
```

The root domain should resolve to the frontend public IPv4 address. The `www` hostname should resolve through the CNAME.

Confirm that the authoritative nameservers match the four NS records in your Route 53 hosted zone. DNS changes can take time to propagate because of resolver caching and TTL.

### 11.9 Test the domain and API

Open these URLs in a browser:

- `http://devcloud.store`
- `http://www.devcloud.store`

Verify that the frontend, CSS and JavaScript load and that the API responds.

Test the API through the domain:

```bash
curl -i http://devcloud.store/api/expenses
```

### 11.10 Understand which component does what

| Component | Responsibility |
|---|---|
| Hostinger | Domain registration and registrar-level nameserver settings |
| Route 53 | Resolves the domain name to the frontend IP |
| EC2 Elastic IP | Provides a stable public IPv4 address |
| Security group | Allows or blocks network traffic |
| Nginx | Receives HTTP requests and serves frontend files |
| Nginx reverse proxy | Forwards `/api/` requests to the backend |
| Backend | Processes application requests |
| MySQL | Stores expense records |

DNS only resolves the domain name. Nginx must separately be configured to handle requests for that domain.

### 11.10 HTTPS configuration

The domain setup described above uses HTTP:

```text
http://devcloud.store
```

HTTP does not encrypt traffic. For production-facing access, configure HTTPS using a trusted TLS certificate. One option is Let's Encrypt with Certbot on Ubuntu and Nginx.

Before requesting a certificate:

- Confirm `devcloud.store` resolves to the frontend public IP.
- Confirm `www.devcloud.store` resolves correctly.
- Allow inbound TCP ports `80` and `443` in the frontend security group.
- Confirm Nginx serves the domain successfully over HTTP.

After configuring the certificate:

- Test `https://devcloud.store`.
- Test `https://www.devcloud.store`.
- Configure HTTP-to-HTTPS redirection.
- Configure and verify automatic certificate renewal.

**Do not document HTTPS as active unless a TLS certificate has actually been installed and tested.**

---

## 12. Start and enable the services

### 12.1 Backend EC2

```bash
sudo systemctl daemon-reload
sudo systemctl enable expense-tracker
sudo systemctl restart expense-tracker
sudo systemctl status expense-tracker
```

Check backend logs:

```bash
sudo tail -n 50 /var/log/expense-tracker/expense-tracker.log
sudo tail -n 50 /var/log/expense-tracker/expense-tracker-error.log
```

### 12.2 Frontend EC2 – Nginx

Nginx is the actual frontend web server:

```bash
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 12.3 Optional frontend marker service

The lab also includes `expense-frontend.service`. It is a **oneshot marker service** that runs `/usr/bin/true` and exits. It is not a web server and does not handle browser requests.

If you want to reproduce the lab exactly, copy `deploy/systemd/expense-frontend.service` to `/etc/systemd/system/expense-frontend.service`, then run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now expense-frontend
sudo systemctl status expense-frontend
```

It may report:

```text
Active: active (exited)
```

That is expected for this oneshot unit. Nginx must still be active and enabled. The marker service is optional and can be omitted.

### 12.4 Database EC2

```bash
sudo systemctl enable mysql
sudo systemctl status mysql
```

---

## 13. Test the complete application

Perform these tests in order. Testing each layer separately makes it easier to identify where a failure occurs.

### 13.1 Test the backend locally

> Run on Backend EC2.

```bash
curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

The root endpoint should return the backend health response. The API endpoint should return JSON.

### 13.2 Test backend connectivity from the frontend

> Run on Frontend EC2.

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
```

Replace `BACKEND_PRIVATE_IP` with the actual private IP.

If these requests fail, check the backend service, backend security group source, backend listener and VPC connectivity.

### 13.3 Test Nginx locally on port 8080

> Run on Frontend EC2.

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/expenses
```

The first request should return frontend HTML. The second should return expenses JSON from the backend through the Nginx reverse proxy.

### 13.4 Test Nginx locally on port 80

> Run on Frontend EC2.

```bash
curl -i -H "Host: devcloud.store" http://localhost/
curl -i -H "Host: devcloud.store" http://localhost/api/expenses
```

The first request should return the domain-specific frontend HTML. The second should return the API response.

### 13.5 Test direct IP access in your browser

Open:

```text
http://FRONTEND_PUBLIC_IP:8080
```

Replace the placeholder with the current frontend public IPv4 address. You should see the Expense Tracker page.

### 13.6 Test domain access in your browser

Open:

```text
http://devcloud.store
http://www.devcloud.store
```

You should see the same Expense Tracker application.

### 13.7 Test retrieving expenses – GET

Open the application and confirm that existing expenses appear in the expense history.

You can also test:

```bash
curl -i http://devcloud.store/api/expenses
```

Expected result: an HTTP success response containing JSON.

### 13.8 Test adding an expense – POST

Use the application form:

1. Enter an expense title.
2. Enter an amount.
3. Select or enter a category, depending on the UI.
4. Select the expense date.
5. Enter a description if available.
6. Submit the form.
7. Confirm that the new expense appears in the expense history.

Sample API request, if the backend accepts these field names:

```bash
curl -i -X POST http://devcloud.store/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Internet Bill",
    "amount": 999,
    "category": "Utilities",
    "expense_date": "2026-11-23",
    "description": "Monthly internet bill"
  }'
```

### 13.9 Test updating an expense – PUT

First identify an existing expense ID. For example, if the ID is `1`:

```bash
curl -i -X PUT http://devcloud.store/api/expenses/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Internet Bill",
    "amount": 1099,
    "category": "Utilities",
    "expense_date": "2026-11-23",
    "description": "Updated monthly internet bill"
  }'
```

Verify that the expense is updated in the application and database.

The example payload must match the fields and validation rules implemented in your backend.

### 13.10 Test deleting an expense – DELETE

Identify an expense ID that you intend to delete. For example:

```bash
curl -i -X DELETE http://devcloud.store/api/expenses/1
```

Verify that:

- The API returns the expected success response.
- The deleted expense no longer appears in the application.
- The corresponding database record has been removed.

Use a test record rather than deleting an important expense.

### 13.11 Compare direct IP and domain API access

```bash
curl -i http://FRONTEND_PUBLIC_IP:8080/api/expenses
curl -i http://devcloud.store/api/expenses
```

Both Nginx server blocks should forward requests to the same backend.

---

## 14. Verify the database records

> **Run on Database EC2.**

Open MySQL:

```bash
sudo mysql
```

Run:

```sql
USE expense_tracker;
SHOW TABLES;
DESCRIBE expenses;
SELECT * FROM expenses ORDER BY id DESC;
EXIT;
```

The expense submitted from the browser should appear in the `expenses` table.

Expected CRUD behaviour:

- `POST` inserts a record.
- `GET` retrieves records.
- `PUT` updates the selected record.
- `DELETE` removes the selected record.

This confirms the end-to-end request flow:

```text
Browser → Nginx → Node.js API → MySQL
```

---

## 15. Application and server logs

Logs help identify whether a problem is in Nginx, the Node.js application or MySQL.

### 15.1 Backend application log

> Run on Backend EC2.

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker.log
```

The backend request-logging middleware records completed requests with:

- Timestamp.
- HTTP method.
- Request path.
- HTTP response status.
- Request duration in milliseconds.

Example format:

```text
2026-11-22T15:45:00.000Z | GET /api/expenses | 200 | 12ms
```

You should see `GET`, `POST`, `PUT` and `DELETE` requests when those operations are performed.

Press `Ctrl+C` to stop following the log.

### 15.2 Backend error log

> Run on Backend EC2.

```bash
sudo tail -f /var/log/expense-tracker/expense-tracker-error.log
```

Also check the systemd journal:

```bash
sudo journalctl -u expense-tracker -n 100 --no-pager
sudo journalctl -u expense-tracker -f
```

### 15.3 Nginx access log

> Run on Frontend EC2.

```bash
sudo tail -f /var/log/nginx/access.log
```

This records incoming HTTP requests handled by Nginx, including requests arriving through ports `80` and `8080`.

### 15.4 Nginx error log

> Run on Frontend EC2.

```bash
sudo tail -f /var/log/nginx/error.log
```

Use this when Nginx cannot read a file, connect to the backend or process a configuration/runtime request.

### 15.5 MySQL service status and logs

> Run on Database EC2.

```bash
sudo systemctl status mysql
sudo journalctl -u mysql -n 50 --no-pager
```

### 15.6 Optional frontend marker service logs

If you installed the optional `expense-frontend.service`, its logs may be available at:

```bash
sudo cat /var/log/expense-frontend/frontend.log
sudo cat /var/log/expense-frontend/frontend-error.log
```

These files capture output from the marker command, not Nginx HTTP requests. They may be empty. Use `/var/log/nginx/access.log` and `/var/log/nginx/error.log` for actual Nginx request/error logs.

### 15.7 Log rotation

For a longer-running environment, configure log rotation and retention for application logs. Do not allow log files to grow indefinitely. Ubuntu commonly supplies logrotate configuration for Nginx; verify that it is enabled on your release.

---

## 16. Reboot and automatic-startup verification

The services should start automatically after their EC2 instances reboot.

### 16.1 Check enabled status before reboot

**Backend EC2:**

```bash
sudo systemctl is-enabled expense-tracker
sudo systemctl status expense-tracker
```

**Frontend EC2:**

```bash
sudo systemctl is-enabled nginx
sudo systemctl status nginx
```

If the optional marker service is installed:

```bash
sudo systemctl is-enabled expense-frontend
sudo systemctl status expense-frontend
```

**Database EC2:**

```bash
sudo systemctl is-enabled mysql
sudo systemctl status mysql
```

### 16.2 Reboot one server at a time

Do not reboot all three instances simultaneously during your first verification.

On the server being tested:

```bash
sudo reboot
```

Wait until the EC2 instance is running and SSH is available again. Reconnect and check the relevant service:

| Server | Service to verify |
|---|---|
| Database EC2 | `sudo systemctl status mysql` |
| Backend EC2 | `sudo systemctl status expense-tracker` |
| Frontend EC2 | `sudo systemctl status nginx` |

After each reboot, repeat the relevant browser and API tests. Also verify that the domain still resolves to the correct frontend public IP.

If you use an Elastic IP, it remains associated with the instance across ordinary stop/start operations unless you disassociate or release it.

---

## 17. Security recommendations

This is a learning deployment. Improve its security before exposing it as a real production application.

- **Restrict SSH:** Allow TCP `22` only from your trusted IP or use Systems Manager Session Manager.
- **Keep the backend private:** Do not expose TCP `5000` to the internet.
- **Keep the database private:** Do not expose TCP `3306` to the internet.
- **Use security-group references:** Frontend SG → Backend SG → Database SG.
- **Protect secrets:** Keep `.env` out of Git and restrict its file permissions.
- **Use least privilege:** The MySQL application account should not be a MySQL administrator.
- **Use HTTPS:** Install and configure a valid TLS certificate for the custom domain.
- **Patch systems:** Apply security updates regularly.
- **Back up MySQL:** Set up and test database backups.
- **Monitor logs:** Configure log rotation, monitoring and alerts.
- **Avoid public SSH for private servers:** Prefer SSM, VPN or a controlled bastion host.
- **Review IAM:** Grant only the AWS permissions required for deployment and operation.
- **Use an Elastic IP:** Avoid DNS becoming stale when the EC2 public IPv4 address changes.
- **Validate API input:** Validate expense IDs, amounts, dates and required fields in the backend.
- **Protect API operations:** Add authentication and authorization before using the application for real user data.
- **Use parameterized SQL:** Avoid constructing SQL queries by concatenating untrusted input.

---

## 18. Troubleshooting

Troubleshoot from the failing layer outward. Run the checks on the server indicated.

### 18.1 Frontend website does not open

> Frontend EC2:

```bash
sudo systemctl status nginx
sudo nginx -t
sudo ss -lntp | grep -E ':80|:8080'
curl -I http://localhost:8080/
curl -I http://localhost/
```

Check:

- Nginx is active.
- Nginx configuration test passes.
- Nginx listens on ports `80` and `8080` as intended.
- Frontend security group allows TCP `80` for domain access.
- Frontend security group allows TCP `8080` from your permitted client IP.
- Frontend public IP is correct.
- Frontend files exist in `/opt/expense-frontend`.

### 18.2 Nginx returns 403 Forbidden

> Frontend EC2:

```bash
namei -l /opt/expense-frontend/index.html
sudo find /opt/expense-frontend -maxdepth 2 -ls
```

Nginx must be able to traverse parent directories and read `index.html`, `style.css` and `script.js`.

### 18.3 Frontend opens, but expenses do not load

> Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
curl -i http://localhost:8080/api/expenses
curl -i http://localhost/api/expenses
```

Check:

- Backend service is running.
- Nginx `proxy_pass` contains the correct backend private IP.
- Backend security group allows TCP `5000` from the frontend security group.
- Backend listens on port `5000`.
- Backend can connect to MySQL.
- Both Nginx server blocks contain the correct `/api/` proxy configuration.

### 18.4 Backend service fails to start

> Backend EC2:

```bash
sudo systemctl status expense-tracker
sudo journalctl -u expense-tracker -n 100 --no-pager
sudo tail -n 100 /var/log/expense-tracker/expense-tracker-error.log
```

Check:

- `server.js` exists at `/opt/expense-tracker/server.js`.
- `node_modules` exists.
- `ExecStart` uses the correct Node.js binary path.
- `.env` exists and contains the required variables.
- The service user can read the application and `.env` files.
- Port `5000` is not already occupied.

### 18.5 Backend cannot connect to MySQL

> Backend EC2:

```bash
mysql -h DATABASE_PRIVATE_IP -u expense_user -p expense_tracker
```

Check:

- `DB_HOST` is the database private IP.
- MySQL is running on Database EC2.
- MySQL listens on the database private interface.
- Database security group allows TCP `3306` from Backend SG.
- MySQL account host matches the backend private IP.
- Password and database name are correct.

> Database EC2:

```bash
sudo systemctl status mysql
sudo ss -lntp | grep 3306
```

### 18.6 Browser reports an API/network error

Test each layer separately.

> Backend EC2:

```bash
curl -i http://localhost:5000/api/expenses
```

> Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/api/expenses
curl -i http://localhost:8080/api/expenses
curl -i http://localhost/api/expenses
```

The first failed test identifies the layer that needs investigation.

### 18.7 Service is `active (exited)`

For `expense-frontend.service`, `active (exited)` is expected because it is a oneshot marker service. It is not Nginx.

Expected states:

| Service | Expected status |
|---|---|
| Nginx | `active (running)` |
| Node.js backend | `active (running)` |
| MySQL | `active (running)` |
| Optional frontend marker | `active (exited)` |

### 18.8 Ping fails between instances

ICMP ping is not required for the application to work. A failed ping does not prove that TCP application connectivity is broken.

Test the actual required TCP service instead. For example, from Frontend EC2:

```bash
curl -i http://BACKEND_PRIVATE_IP:5000/
```

Use security group rules and service listeners to troubleshoot application connectivity. Add ICMP only if you specifically need ping for diagnostics.

### 18.9 Domain does not open

Check DNS resolution:

```bash
nslookup devcloud.store
nslookup www.devcloud.store
```

Check:

- The Route 53 public hosted zone exists.
- Hostinger is configured with the exact four Route 53 nameservers.
- The A record points to the current frontend public IP or Elastic IP.
- The `www` CNAME points to `devcloud.store`.
- DNS changes have had time to propagate.
- Frontend security group permits TCP port `80`.
- Nginx is running and listening on port `80`.

### 18.10 Domain resolves, but website does not load

> Frontend EC2:

```bash
sudo nginx -t
sudo systemctl status nginx
sudo ss -lntp | grep ':80'
curl -i -H "Host: devcloud.store" http://localhost/
```

Check:

- The domain-specific Nginx configuration exists.
- It contains `server_name devcloud.store www.devcloud.store;`.
- The root directory is `/opt/expense-frontend`.
- Nginx has reloaded successfully.
- The domain A record points to the correct frontend instance.

### 18.11 Domain and direct IP show different CSS or layouts

Compare the active Nginx configurations:

```bash
sudo nginx -T | grep -n -B 10 -A 20 -E 'listen 8080|listen 80|server_name|root'
```

Both should serve:

```text
/opt/expense-frontend
```

Inspect the files:

```bash
ls -l /opt/expense-frontend/
```

Check the browser developer tools for failed CSS or JavaScript requests. A different Nginx root, different frontend files or browser cache can cause different designs.

### 18.12 API returns HTML instead of JSON

An error such as:

```text
Unexpected token '<', "..." is not valid JSON
```

can mean the request reached an Nginx HTML page instead of the backend API.

Test:

```bash
curl -i http://devcloud.store/api/expenses
curl -i http://FRONTEND_PUBLIC_IP:8080/api/expenses
```

Check that both the port `80` and port `8080` Nginx server blocks contain a correct `/api/` location and `proxy_pass` pointing to the backend private IP.

### 18.13 PUT request does not update an expense

Check:

- The PUT route exists in `expenseRoutes.js`.
- The route maps to the correct controller function.
- The frontend sends the correct expense ID.
- The request body uses the expected field names.
- The controller validates the ID and input.
- The database user has `UPDATE` permission.
- Backend logs show the PUT request and response status.

Test the endpoint directly using `curl`.

### 18.14 DELETE request does not delete an expense

Check:

- The DELETE route exists in `expenseRoutes.js`.
- The route maps to the correct controller function.
- The expense ID is valid.
- The controller executes the intended DELETE query.
- The database user has `DELETE` permission.
- Backend logs show the DELETE request and response status.

Verify the database record:

```sql
SELECT * FROM expenses WHERE id = 1;
```

Replace `1` with the ID you tested.

### 18.15 Nginx reports duplicate default server

Inspect all active configurations:

```bash
sudo nginx -T | grep -n -E 'listen 80|default_server'
```

If an existing configuration already declares `listen 80 default_server`, do not add another default server for the same address and port.

The domain-specific server block can use:

```nginx
listen 80;
server_name devcloud.store www.devcloud.store;
```

Test again:

```bash
sudo nginx -t
```

Do not delete the existing default configuration unless you have confirmed it is no longer required.

---

## 19. Final deployment checklist

Use this checklist to confirm the deployment is complete.

### AWS infrastructure

- [ ] Three Ubuntu EC2 instances are running.
- [ ] All three instances are in the intended VPC.
- [ ] Private IP addresses have been recorded.
- [ ] Frontend, backend and database security groups are attached correctly.
- [ ] SSH is restricted to the administrator's IP or an approved private access method.
- [ ] Frontend port `80` is accessible for domain HTTP traffic.
- [ ] Frontend port `8080` is accessible from the permitted client IP.
- [ ] Backend port `5000` is not publicly exposed.
- [ ] Database port `3306` is not publicly exposed.

### Database tier

- [ ] MySQL is installed and running.
- [ ] MySQL is enabled at boot.
- [ ] MySQL listens on the database private IP.
- [ ] `expense_tracker` database exists.
- [ ] `expenses` table exists.
- [ ] `expense_user` is restricted to the backend host.
- [ ] Backend can connect to MySQL.
- [ ] Database user has the required CRUD permissions.

### Backend tier

- [ ] Node.js and npm are installed.
- [ ] Backend source files are in `/opt/expense-tracker`.
- [ ] `.env` has the correct values and is protected.
- [ ] `expenseapp` system user exists.
- [ ] Backend log files exist with restricted permissions.
- [ ] `expense-tracker.service` is enabled and active.
- [ ] Backend API responds on port `5000`.
- [ ] GET endpoint works.
- [ ] POST endpoint works.
- [ ] PUT endpoint works.
- [ ] DELETE endpoint works.

### Frontend tier

- [ ] Nginx is installed, enabled and running.
- [ ] `frontendapp` system user exists.
- [ ] Frontend files are in `/opt/expense-frontend`.
- [ ] Nginx configuration passes `nginx -t`.
- [ ] Nginx listens on port `8080`.
- [ ] Nginx listens on port `80` for the custom domain.
- [ ] Both configurations serve `/opt/expense-frontend`.
- [ ] Both configurations proxy `/api/` to the correct backend private IP.
- [ ] Frontend page opens using the direct IP URL.
- [ ] Frontend page opens using the custom domain.

### Domain and DNS

- [ ] `devcloud.store` is registered through Hostinger.
- [ ] A Route 53 public hosted zone exists for `devcloud.store`.
- [ ] Hostinger nameservers match the four Route 53 NS records.
- [ ] Root-domain A record points to the frontend public IP or Elastic IP.
- [ ] `www` CNAME points to `devcloud.store`.
- [ ] `devcloud.store` resolves correctly.
- [ ] `www.devcloud.store` resolves correctly.
- [ ] Domain requests reach Nginx on port `80`.
- [ ] Domain API requests reach the backend through Nginx.
- [ ] HTTPS certificate and redirection are configured before production use.

### End-to-end and operations

- [ ] Browser can retrieve existing expenses.
- [ ] Browser can add a new expense.
- [ ] Browser can update an expense.
- [ ] Browser can delete a test expense.
- [ ] Database records match the operations performed.
- [ ] Backend application logs are working.
- [ ] Backend error logs are accessible.
- [ ] Nginx access and error logs are accessible.
- [ ] MySQL service status and logs are accessible.
- [ ] MySQL starts after reboot.
- [ ] Backend starts after reboot.
- [ ] Nginx starts after reboot.
- [ ] Application works after rebooting the instances one at a time.

---

## 20. Useful commands reference

### Check service status

```bash
sudo systemctl status nginx
sudo systemctl status expense-tracker
sudo systemctl status mysql
```

### Start, stop and restart a service

```bash
sudo systemctl start SERVICE_NAME
sudo systemctl stop SERVICE_NAME
sudo systemctl restart SERVICE_NAME
```

### Enable a service at boot

```bash
sudo systemctl enable SERVICE_NAME
```

### Check whether a service is enabled

```bash
sudo systemctl is-enabled SERVICE_NAME
```

### Follow service and application logs

```bash
sudo journalctl -u SERVICE_NAME -f
sudo tail -f /var/log/expense-tracker/expense-tracker.log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Check listening ports

```bash
sudo ss -lntp
```

### Test local HTTP endpoints

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/api/expenses

curl -i http://localhost/
curl -i http://localhost/api/expenses

curl -i http://localhost:5000/
curl -i http://localhost:5000/api/expenses
```

### Test domain endpoints

```bash
curl -i http://devcloud.store/
curl -i http://www.devcloud.store/
curl -i http://devcloud.store/api/expenses
```

### Check DNS

```bash
nslookup devcloud.store
nslookup www.devcloud.store

dig devcloud.store
dig www.devcloud.store
dig NS devcloud.store
```

### Validate and inspect Nginx

```bash
sudo nginx -t
sudo nginx -T
sudo systemctl reload nginx
```

### Reload systemd after changing a unit file

```bash
sudo systemctl daemon-reload
sudo systemctl restart expense-tracker
```

### Inspect Nginx port and proxy configuration

```bash
sudo nginx -T | grep -n -B 10 -A 20 -E 'listen 8080|listen 80|server_name|root|proxy_pass'
```

---

## 21. Project scope and limitations

- The application supports all four CRUD operations: `POST /api/expenses`, `GET /api/expenses`, `PUT /api/expenses/:id` and `DELETE /api/expenses/:id`.
- The frontend is static HTML, CSS and JavaScript served by Nginx.
- Nginx serves the frontend through port `8080` for direct IP access and port `80` for custom-domain access.
- Both Nginx configurations should use `/opt/expense-frontend` as the document root.
- Nginx proxies `/api/` requests to the backend private IP on port `5000`.
- The domain `devcloud.store` was purchased through Hostinger.
- Amazon Route 53 is used for DNS hosting through a public hosted zone.
- The root domain uses an A record pointing to the frontend public IPv4 address.
- `www.devcloud.store` uses a CNAME record pointing to `devcloud.store`.
- The domain's authoritative nameservers must be configured at Hostinger to match the Route 53 hosted zone.
- The domain uses HTTP unless a TLS certificate has separately been installed and verified.
- Nginx uses the standard Ubuntu log files at `/var/log/nginx/access.log` and `/var/log/nginx/error.log`. Dedicated custom Nginx log files can be configured later.
- The optional `expense-frontend.service` is a oneshot marker, not the frontend web server. Nginx is the actual web server.
- Private IPs shown in this documentation are examples from the original lab. Replace them with the values in your AWS environment.
- The frontend source in the repository is a reproducible project copy and may not be byte-for-byte identical to every styling change made directly on the original EC2 instance.
- The frontend public IP shown in the original lab is a recorded value, not a guaranteed current address. If it changes, update the Route 53 A record. An Elastic IP is recommended for stable domain mapping.
- This guide describes a learning deployment. Production use requires additional work such as HTTPS, authentication, authorization, backups, monitoring, log rotation, stronger operational controls and an application security review.

### Deployment order at a glance

Follow this sequence when building from scratch:

1. Create or select the VPC and networking.
2. Create the three security groups.
3. Launch Frontend, Backend and Database EC2 instances.
4. Record private IP addresses and the frontend public IP.
5. Configure MySQL on Database EC2.
6. Create the database, application user and table.
7. Install Node.js and deploy backend files on Backend EC2.
8. Configure `.env`, service user, logs and systemd on Backend EC2.
9. Install Nginx and deploy frontend files on Frontend EC2.
10. Configure Nginx port `8080` for direct IP access.
11. Configure Nginx port `80` for the custom domain.
12. Start and enable services.
13. Create the Route 53 public hosted zone.
14. Update Hostinger nameservers to the Route 53 nameservers.
15. Create the Route 53 A and CNAME records.
16. Test DNS resolution and domain access.
17. Test backend, frontend, CRUD APIs and database separately.
18. Add, retrieve, update and delete expenses through the application.
19. Verify database records and inspect application/Nginx logs.
20. Reboot one instance at a time and verify automatic startup.

---

**Learning approach:** Complete one step, verify its expected result, and only then move to the next step. This makes it easier to understand the full request flow and isolate problems when something fails.
