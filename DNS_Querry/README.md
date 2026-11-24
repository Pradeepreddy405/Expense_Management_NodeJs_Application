# DNS Configuration, Delegation & Propagation
## Domain: devcloud.store | Hostinger + AWS Route 53

---

## 1. Project Overview

This document explains how to configure DNS for a domain purchased through Hostinger and manage its DNS records using AWS Route 53.

### Project details

| Component | Configuration |
|---|---|
| Domain | devcloud.store |
| Domain Registrar | Hostinger |
| DNS Hosting Provider | AWS Route 53 |
| Hosted Zone Type | Public Hosted Zone |
| Frontend Server | AWS EC2 |
| Frontend Public IP | 98.93.100.92 |
| DNS Record Type 1 | A |
| DNS Record Type 2 | CNAME |

### Objective

Configure DNS so that users can access the Expense Tracker application using:

- http://devcloud.store
- http://www.devcloud.store

The DNS records are maintained in AWS Route 53, while Hostinger remains the domain registrar.

---

# 2. What is DNS?

DNS stands for Domain Name System.

DNS translates human-readable domain names into IP addresses.

For example:

```text
devcloud.store
       |
       v
  98.93.100.92
```

Computers communicate using IP addresses, but users generally remember domain names.

DNS acts like the internet's phonebook by helping computers find the correct destination for a domain name.

### Why do we need DNS?

Without DNS, users would need to remember the server's IP address instead of using a domain name.

For example:

Instead of:

```text
http://devcloud.store
```

Users would need to access:

```text
http://98.93.100.92
```

DNS makes accessing applications easier through domain names.

---

# 3. Understanding the DNS Hierarchy

DNS follows a hierarchical structure.

The major levels are:

1. Root DNS Servers
2. Top-Level Domain (TLD) DNS Servers
3. Domain Delegation
4. Authoritative DNS Servers
5. DNS Records

### DNS hierarchy

```text
                    ROOT DNS (.)
                         |
                         |
                  TLD DNS (.store)
                         |
                         |
                 devcloud.store
                         |
                         |
                AWS Route 53 DNS
                         |
                -----------------
                |               |
              A Record       CNAME Record
                |               |
                v               v
          98.93.100.92    devcloud.store
```

Each level provides information that helps the DNS resolver reach the next level.

---

# 4. Domain Registrar – Hostinger

Hostinger is where the domain `devcloud.store` was purchased.

A domain registrar manages domain registration and the nameserver settings associated with the domain.

Initially, the domain may use Hostinger's default nameservers.

However, in this project, we want AWS Route 53 to manage DNS.

Therefore, we update the domain's nameservers in Hostinger.

### Steps

1. Log in to Hostinger.
2. Navigate to Domains.
3. Select `devcloud.store`.
4. Open the Nameservers section.
5. Select the option to use custom nameservers.
6. Enter the four nameservers provided by AWS Route 53.
7. Save the changes.

### Why do we update nameservers?

We need to tell the parent DNS infrastructure which DNS provider is authoritative for our domain.

By configuring AWS nameservers in Hostinger, we delegate DNS management to AWS Route 53.

**Important:** Hostinger remains the domain registrar. AWS Route 53 becomes the DNS hosting provider.

---

# 5. AWS Route 53 – Creating a Public Hosted Zone

AWS Route 53 is an AWS DNS service.

It provides DNS hosting and domain name resolution.

### Steps to create a Hosted Zone

1. Log in to the AWS Management Console.
2. Search for Route 53.
3. Open Route 53.
4. Select Hosted Zones.
5. Click Create Hosted Zone.
6. Enter the following details:

| Field | Value |
|---|---|
| Domain Name | devcloud.store |
| Type | Public Hosted Zone |
| Description | DNS management for Expense Tracker |

7. Click Create Hosted Zone.

### What is a Hosted Zone?

A Hosted Zone is a container for DNS records belonging to a domain.

For example:

```text
Hosted Zone: devcloud.store

Records:
    A       devcloud.store
    CNAME   www.devcloud.store
    NS      devcloud.store
    SOA     devcloud.store
```

The NS and SOA records are created automatically when the Hosted Zone is created.

---

# 6. Understanding the Four AWS Nameservers

After creating the Public Hosted Zone, AWS Route 53 provides four authoritative nameservers.

Example:

```text
ns-xxxx.xxxxxxawsdns-xxx.uk
ns-xxxx.xxxxxxawsdns-xxx.com
ns-xxxx.xxxxxxawsdns-xxxnet
ns-xxxx.xxxxxxawsdns-xxx.org
```

These are the nameservers returned in our actual DNS verification.

### Why does AWS provide four nameservers?

AWS provides multiple authoritative nameservers to improve availability and resilience.

Even if one nameserver is unavailable, other authoritative nameservers can respond to DNS queries.

### Why do we copy them to Hostinger?

Because Hostinger manages our domain registration, we need to update the domain's delegation settings there.

We copy the four AWS nameservers into Hostinger's custom nameserver configuration.

The process is:

```text
Hostinger
    |
    | Custom Nameservers
    |
    v
AWS Route 53
    |
    | Four Authoritative Nameservers
    |
    v
devcloud.store
```

This process is called DNS delegation.

**Important:** The four nameservers must match exactly between Hostinger's delegation settings and the Route 53 Hosted Zone.

---

# 7. Configuring DNS Records in AWS Route 53

After creating the Hosted Zone, configure the required DNS records.

## 7.1 A Record

An A record maps a domain name to an IPv4 address.

### Configuration

| Field | Value |
|---|---|
| Record Name | devcloud.store |
| Record Type | A |
| Value | 98.93.100.92 |
| Routing Policy | Simple |

### Purpose

The A record directs the root domain to our frontend EC2 public IP.

```text
devcloud.store
       |
       v
  98.93.100.92
       |
       v
  Frontend EC2
```

When a user enters `devcloud.store`, DNS returns the configured IPv4 address.

## 7.2 CNAME Record

A CNAME record creates an alias from one domain name to another.

### Configuration

| Field | Value |
|---|---|
| Record Name | www |
| Record Type | CNAME |
| Value | devcloud.store |
| Routing Policy | Simple |

### Purpose

This makes the www subdomain an alias of the root domain.

```text
www.devcloud.store
        |
        v
  devcloud.store
        |
        v
   98.93.100.92
```

Both domain names ultimately reach the same frontend server.

---

# 8. Understanding DNS Delegation

DNS delegation means informing the parent DNS zone which nameservers are responsible for managing a particular domain.

In our project:

- Hostinger manages domain registration.
- The `.store` registry publishes the domain's delegation.
- AWS Route 53 manages authoritative DNS records.

### Delegation flow

```text
Domain Registrar
    |
    | Hostinger updates nameserver settings
    |
    v
.store TLD DNS Servers
    |
    | Delegation information
    |
    v
AWS Route 53 Nameservers
    |
    | DNS records
    |
    v
devcloud.store
```

### Why is DNS delegation required?

Creating a Hosted Zone in AWS does not automatically make AWS authoritative for your domain.

The parent DNS infrastructure must know that AWS is responsible for your domain.

That is why we copy the AWS nameservers into Hostinger.

---

# 9. Understanding DNS Propagation

DNS propagation refers to updated DNS information becoming available through DNS infrastructure and recursive resolvers.

When nameservers are changed, DNS resolvers may temporarily have cached older information.

Therefore, different resolvers may not immediately show the same result.

### Example

Before changing nameservers:

```text
devcloud.store
      |
      v
Hostinger Nameservers
```

After changing nameservers:

```text
devcloud.store
      |
      v
AWS Route 53 Nameservers
```

Different recursive resolvers may retain previously cached information until their cache entries expire.

### How long does propagation take?

Nameserver changes are often visible within hours, but complete worldwide cache convergence can take up to 24–48 hours or sometimes longer depending on cached records and registrar/registry updates.

---

# 10. DNS Resolution – Complete End-to-End Flow

Let's understand what happens when a user enters:

```text
https://devcloud.store
```

### Step 1: User enters the domain

The browser needs to discover the IP address associated with the domain.

### Step 2: DNS Resolver

The browser or operating system uses a DNS resolver.

Examples:

```text
Google DNS:    8.8.8.8
Cloudflare:    1.1.1.1
Quad9:         9.9.9.9
```

The resolver may already have the answer in its cache.

If not, it performs DNS lookups.

### Step 3: Root DNS Servers

The resolver contacts a root DNS server.

The root DNS system directs the resolver to the `.store` TLD nameservers.

### Step 4: TLD DNS Servers

The `.store` TLD nameservers provide the delegation information for `devcloud.store`.

They return the four AWS Route 53 nameservers.

### Step 5: AWS Route 53

The resolver queries an AWS authoritative nameserver.

AWS responds with the configured A record:

```text
devcloud.store → 98.93.100.92
```

### Step 6: Browser connects to EC2

The browser uses the returned IP address to connect to the frontend EC2 instance.

### Step 7: Nginx serves the application

Nginx receives the request and serves the Expense Tracker frontend.

### Complete flow

```text
User Browser
     |
     v
DNS Resolver
     |
     v
Root DNS Servers
     |
     v
.store TLD DNS Servers
     |
     v
AWS Route 53 Nameservers
     |
     v
A Record: 98.93.100.92
     |
     v
AWS EC2 Frontend
     |
     v
Nginx
     |
     v
Expense Tracker Application
```

**Important:** DNS resolves the domain to an IP address. HTTPS certificates, Nginx routing, frontend files, and backend API communication are separate stages.

---

# 11. DNS Verification Using Linux Commands

We use `dig` to troubleshoot and verify DNS.

## Step 1: Install DNS utilities

On Ubuntu:

```bash
sudo apt update
sudo apt install dnsutils -y
```

In newer Ubuntu releases, the package may be provided by `bind9-dnsutils`.

Verify:

```bash
dig -v
```

## Step 2: Check NS records

Command:

```bash
dig NS devcloud.store
```

### Purpose

This checks which nameservers your configured DNS resolver returns for the domain.

Expected nameservers:

```text
ns-xxxx.xxxxxxawsdns-xxx.uk
ns-xxxx.xxxxxxawsdns-xxx.com
ns-xxxx.xxxxxxawsdns-xxxnet
ns-xxxx.xxxxxxawsdns-xxx.org
```

### Understanding the output

```text
ANSWER SECTION:

devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.uk.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.com.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxxnet.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.org.
```

All four should match the nameservers assigned to your Route 53 Hosted Zone.

## Step 3: Check complete DNS delegation

Command:

```bash
dig +trace devcloud.store
```

### Purpose

This command traces DNS resolution from the root DNS servers to the authoritative nameservers.

It helps us understand:

1. Root DNS lookup.
2. TLD DNS lookup.
3. Domain delegation.
4. AWS authoritative DNS response.

### What should we look for?

First, root nameservers:

```text
. IN NS a.root-servers.net.
```

Next, `.store` TLD nameservers:

```text
store. IN NS ns01.trs-dns.com.
store. IN NS ns01.trs-dns.net.
```

Next, AWS nameservers:

```text
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.uk.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.com.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxxnet.
devcloud.store. IN NS ns-xxxx.xxxxxxawsdns-xxx.org.
```

Finally, the A record:

```text
devcloud.store. IN A 98.93.100.92
```

If the trace successfully reaches AWS and receives the expected DNS answer, the delegation chain is working.

## Step 4: Check Google DNS

Command:

```bash
dig NS devcloud.store @8.8.8.8
```

Purpose:

Queries Google's public DNS resolver.

Expected result:

Four AWS nameservers.

## Step 5: Check Cloudflare DNS

Command:

```bash
dig NS devcloud.store @1.1.1.1
```

Purpose:

Queries Cloudflare's public DNS resolver.

Expected result:

Four AWS nameservers.

## Step 6: Check Quad9 DNS

Command:

```bash
dig NS devcloud.store @9.9.9.9
```

Purpose:

Queries Quad9's public DNS resolver.

Expected result:

Four AWS nameservers.

## Step 7: Verify A record

Command:

```bash
dig A devcloud.store @8.8.8.8
```

Expected result:

```text
devcloud.store. IN A 98.93.100.92
```

Purpose:

Confirms that the domain resolves to the expected public IPv4 address.

## Step 8: Verify CNAME record

Command:

```bash
dig CNAME www.devcloud.store @8.8.8.8
```

Expected result:

```text
www.devcloud.store. IN CNAME devcloud.store.
```

Purpose:

Confirms that the www subdomain points to the root domain.

## Step 9: Verify the final www IP address

Command:

```bash
dig A www.devcloud.store @8.8.8.8
```

Expected result:

```text
www.devcloud.store. IN A 98.93.100.92
```

The resolver follows the CNAME to obtain the final IPv4 address.

## Step 10: Query AWS authoritative DNS directly

Command:

```bash
dig A devcloud.store @ns-xxxx.xxxxxxawsdns-xxx.com
```

Purpose:

Queries an AWS authoritative nameserver directly, bypassing recursive public DNS resolvers.

Expected result:

```text
devcloud.store. IN A 98.93.100.92
```

This helps isolate issues between authoritative DNS and recursive resolver caches.

---

# 12. Understanding the DNS Command Options

| Command | Purpose |
|---|---|
| `dig NS domain` | Checks nameserver records |
| `dig +trace domain` | Traces the DNS delegation chain |
| `dig A domain` | Checks IPv4 address |
| `dig CNAME domain` | Checks CNAME alias |
| `dig NS domain @8.8.8.8` | Queries Google DNS |
| `dig NS domain @1.1.1.1` | Queries Cloudflare DNS |
| `dig NS domain @9.9.9.9` | Queries Quad9 DNS |
| `dig A domain @nameserver` | Queries a specific nameserver |

### Important DNS response fields

| Field | Meaning |
|---|---|
| `NOERROR` | DNS query completed without a DNS error |
| `ANSWER SECTION` | Contains returned DNS records |
| `AUTHORITY SECTION` | Contains authoritative information, when returned |
| `ADDITIONAL SECTION` | Additional information supplied with the response |
| `TTL` | Time for which a DNS record can be cached |
| `SERVER` | DNS server that answered the query |
| `QUERY TIME` | Time taken to receive the response |

---

# 13. Actual DNS Verification Results – devcloud.store

The following results were obtained from our Ubuntu Frontend EC2 instance on November 24, 2026.

### NS record verification

Command:

```bash
dig NS devcloud.store
```

Result:

```text
ns-xxxx.xxxxxxawsdns-xxx.uk.
ns-xxxx.xxxxxxawsdns-xxx.com.
ns-xxxx.xxxxxxawsdns-xxxnet.
ns-xxxx.xxxxxxawsdns-xxx.org.
```

Status: Successful.

### Delegation verification

Command:

```bash
dig +trace devcloud.store
```

Result:

- Root DNS lookup successful.
- `.store` TLD lookup successful.
- Delegation to AWS successful.
- AWS authoritative DNS returned the A record.

Status: Successful.

### Public resolver verification

| Resolver | IP | Result |
|---|---|---|
| Google DNS | 8.8.8.8 | AWS NS records returned |
| Cloudflare DNS | 1.1.1.1 | AWS NS records returned |
| Quad9 DNS | 9.9.9.9 | AWS NS records returned |

Status: Successful.

### A record verification

Command:

```bash
dig A devcloud.store @8.8.8.8
```

Result:

```text
devcloud.store. 1 IN A 98.93.100.92
```

Status: Successful.

### CNAME verification

Command:

```bash
dig CNAME www.devcloud.store @8.8.8.8
```

Result:

```text
www.devcloud.store. 300 IN CNAME devcloud.store.
```

Status: Successful.

### Final verification summary

| Verification | Status |
|---|---|
| Hostinger nameserver configuration | Verified through delegation |
| Root DNS resolution | Successful |
| `.store` TLD delegation | Successful |
| AWS Route 53 delegation | Successful |
| Google DNS resolution | Successful |
| Cloudflare DNS resolution | Successful |
| Quad9 DNS resolution | Successful |
| A record | Successful |
| CNAME record | Successful |

**Conclusion:** DNS delegation is working, and the tested public DNS resolvers return the expected AWS nameservers and DNS records.

Note: These checks verify the tested DNS paths. They do not prove that every DNS resolver worldwide has refreshed its cache.

---

# 14. Troubleshooting DNS Issues

### Problem 1: Old nameservers are returned

Possible causes:

- Nameserver changes were not saved in Hostinger.
- Parent registry has not published the update yet.
- Recursive resolver is using cached information.

Check:

```bash
dig +trace devcloud.store
```

Compare the nameservers returned by the `.store` TLD with your AWS Hosted Zone.

### Problem 2: DNS returns NXDOMAIN

Possible causes:

- Domain does not exist in the queried DNS view.
- Incorrect Hosted Zone.
- Missing DNS record.
- Delegation points to the wrong DNS provider.

Check:

```bash
dig A devcloud.store
```

Also query AWS directly:

```bash
dig A devcloud.store @ns-xxxx.xxxxxxawsdns-xxx.com
```

### Problem 3: A record returns the wrong IP

Check the A record in:

AWS Console → Route 53 → Hosted Zones → devcloud.store.

Confirm that the configured IPv4 address is correct.

### Problem 4: www subdomain does not resolve

Check:

```bash
dig CNAME www.devcloud.store
```

Confirm that the CNAME points to:

```text
devcloud.store
```

### Problem 5: DNSSEC validation errors

If nameservers and records appear correct but validating resolvers return `SERVFAIL`, check DNSSEC configuration.

An outdated DS record at the registrar or parent zone can prevent successful DNS resolution.

Do not delete a DS record without checking whether DNSSEC is enabled and correctly configured in Route 53.

---

# 15. Understanding DNS TTL

TTL stands for Time To Live.

It determines how long a DNS resolver can cache a DNS record before it needs to query again.

Example:

```text
devcloud.store. 300 IN A 98.93.100.92
```

Here:

```text
300 seconds = 5 minutes
```

If a resolver caches this record, it can reuse the answer for the remaining TTL instead of querying AWS again.

### Why is TTL important?

A shorter TTL can help changes become visible sooner after existing cached answers expire.

A longer TTL reduces repeated DNS queries but can keep old answers cached for longer.

**Project observation:** Our A record response showed a TTL of 1 second. This is unusually low. We should inspect the configured TTL in Route 53 and consider using a more practical value, such as 300 seconds, depending on the application's requirements.

Remember that changing the TTL does not immediately remove records already cached with their previous TTL.

---

# 16. DNS vs HTTP vs HTTPS

It is important to understand that DNS and web-server communication are separate processes.

| Technology | Responsibility |
|---|---|
| DNS | Resolves domain names into IP addresses |
| HTTP | Transfers web requests and responses |
| HTTPS | Secures HTTP communication using TLS |
| Nginx | Serves frontend files and routes requests |
| Node.js | Runs the backend application |
| MySQL | Stores application data |

### Example

```text
User enters:
https://devcloud.store
          |
          v
DNS Resolution
          |
          v
98.93.100.92
          |
          v
HTTPS Connection
          |
          v
Nginx
          |
          v
Expense Tracker Frontend
          |
          v
Backend API
          |
          v
MySQL Database
```

DNS does not configure SSL certificates or Nginx redirects.

Those are separate application and web-server configurations.

---

# 17. Important DNS Concepts for Interviews

**Q1. What is DNS?**

DNS translates domain names into IP addresses.

**Q2. What is a DNS resolver?**

A DNS resolver receives DNS queries and obtains answers, either from its cache or by querying other DNS servers.

**Q3. What is DNS delegation?**

DNS delegation is the process of assigning responsibility for a domain to its authoritative nameservers through the parent DNS zone.

**Q4. What is DNS propagation?**

It describes how DNS changes become available through DNS infrastructure and cached resolvers.

**Q5. Why does AWS provide four nameservers?**

To provide authoritative DNS availability and resilience.

**Q6. What is a Hosted Zone?**

A Hosted Zone is a container for DNS records belonging to a domain in Route 53.

**Q7. What is an A record?**

An A record maps a hostname to an IPv4 address.

**Q8. What is a CNAME record?**

A CNAME record maps one DNS name to another DNS name.

**Q9. What is the difference between an A record and CNAME?**

An A record points to an IPv4 address, whereas a CNAME points to another hostname.

**Q10. What does `dig +trace` do?**

It traces the DNS resolution path starting from root DNS servers and follows referrals toward the authoritative nameservers.

**Q11. Why do we use Google DNS and Cloudflare DNS for testing?**

To verify that different independent recursive DNS resolvers return consistent results.

**Q12. What is TTL?**

TTL determines how long a DNS record can remain cached by a resolver.

---

# 18. Final Project Architecture

```text
                  INTERNET
                     |
                     |
                DOMAIN USER
                     |
                     |
              devcloud.store
                     |
                     |
                HOSTINGER
              Domain Registrar
                     |
                     |
             Nameserver Delegation
                     |
                     |
              .store TLD DNS
                     |
                     |
               AWS ROUTE 53
                Public Zone
                     |
              -----------------
              |               |
           A Record        CNAME
              |               |
              v               v
       98.93.100.92     devcloud.store
              |
              |
          AWS EC2
        Frontend Server
              |
              |
            NGINX
              |
              |
       Expense Tracker UI
              |
              |
          Backend EC2
              |
              |
         Node.js API
              |
              |
          MySQL DB
```

---

# 19. Final Conclusion

In this project, we configured DNS management using AWS Route 53 while retaining Hostinger as the domain registrar.

We created a Public Hosted Zone, configured A and CNAME records, copied the four AWS nameservers into Hostinger, and verified DNS delegation and resolution using Linux `dig` commands.

We also tested the DNS configuration using Google DNS, Cloudflare DNS, and Quad9.

The verification confirmed that the tested DNS resolvers return the expected AWS nameservers, and the domain resolves to the configured frontend EC2 IP address.

**The complete DNS configuration and delegation verification for `devcloud.store` was successful.**

---

## Useful References

1. AWS Route 53 Documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html
2. DNS Concepts: https://www.cloudflare.com/learning/dns/what-is-dns/
3. DNS Checker: https://dnschecker.org/
4. Hostinger DNS Help: https://www.hostinger.com/tutorials/dns
5. Google Public DNS: https://developers.google.com/speed/public-dns

**End of Documentation**