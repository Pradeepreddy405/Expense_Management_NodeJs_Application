#!/usr/bin/env bash
set -euo pipefail

# Run on Backend EC2 after copying the application into /opt/expense-tracker.
sudo useradd --system --user-group \
  --home-dir /opt/expense-tracker \
  --no-create-home \
  --shell /usr/sbin/nologin expenseapp || true

sudo chown -R expenseapp:expenseapp /opt/expense-tracker
sudo chmod 640 /opt/expense-tracker/.env

sudo mkdir -p /var/log/expense-tracker
sudo touch /var/log/expense-tracker/expense-tracker.log
sudo touch /var/log/expense-tracker/expense-tracker-error.log
sudo chown -R expenseapp:expenseapp /var/log/expense-tracker
sudo chmod 750 /var/log/expense-tracker
sudo chmod 640 /var/log/expense-tracker/*.log

echo "Backend service user and directories are prepared."
