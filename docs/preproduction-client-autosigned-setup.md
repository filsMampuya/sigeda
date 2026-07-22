# Configuration client preproduction SIGEDA avec certificat autosigne

Date de reference : `2026-07-22`

## Objectif

Rendre la preproduction SIGEDA accessible depuis les postes clients sans attendre :

- un certificat emis par une autorite interne ;
- une modification immediate de l'infrastructure PKI ;
- une generalisation globale par GPO.

Cette procedure est adaptee a un environnement Windows 10 Professionnel.

## Point important

Pour Chrome, Edge et une partie des outils Windows, le parametre qui compte est :

```txt
HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings\ProxyOverride
```

La commande :

```powershell
netsh winhttp show proxy
```

ne suffit pas pour conclure que le navigateur contournera correctement le proxy.

## 0. Correctif durable cote serveur ou poste client

Depuis le depot SIGEDA, lancer PowerShell en administrateur puis executer :

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows\Set-SigedaPreprodBrowserAccess.ps1 -HostName sigeda-preprod.hdm -ServerIp 172.16.10.88 -CloseBrowsers -FlushDns
```

Ce script :

- injecte `sigeda-preprod.hdm`, `*.hdm`, `172.16.10.88` et `<local>` dans `ProxyOverride` ;
- met a jour le fichier `hosts` ;
- renseigne aussi `NO_PROXY` pour l'utilisateur courant ;
- force le rafraichissement WinINET ;
- ferme les navigateurs si demande pour repartir sur un etat propre.

## 0 bis. Verrouiller Chrome et Edge sur la pile reseau Windows

Si `curl.exe` fonctionne mais que Chrome ou Edge affichent encore `Ce site est inaccessible`, appliquer aussi les politiques Chromium :

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\windows\Set-SigedaPreprodChromiumPolicies.ps1 -HostName sigeda-preprod.hdm -ServerIp 172.16.10.88
```

Ce script desactive :

- DNS-over-HTTPS ;
- le client DNS integre Chromium ;
- QUIC ;

et force :

- `ProxyMode=system`
- `ProxyBypassList` avec `sigeda-preprod.hdm`, `*.hdm`, `172.16.10.88`, `localhost`, `127.0.0.1`, `<local>`

Apres execution :

```powershell
taskkill /IM chrome.exe /F
taskkill /IM msedge.exe /F
```

puis relancer les navigateurs normalement.

## Hypotheses

- serveur preproduction SIGEDA : `172.16.10.88`
- URL cible : `https://sigeda-preprod.hdm:3443`
- certificat autosigne courant present sur le serveur
- fichier certificat a diffuser aux postes : `sigeda-preprod.cer` ou equivalent derive du certificat actif

## Resultat attendu sur chaque poste client

Le poste doit :

- resoudre `sigeda-preprod.hdm` vers `172.16.10.88`
- ne pas envoyer ce domaine au proxy entreprise
- faire confiance au certificat autosigne de SIGEDA
- ouvrir l'URL `https://sigeda-preprod.hdm:3443/login` dans Chrome, Edge, Firefox ou Opera

## 1. Ajouter la resolution locale du domaine

Modifier le fichier :

```txt
C:\Windows\System32\drivers\etc\hosts
```

Ajouter :

```txt
172.16.10.88 sigeda-preprod.hdm
```

Ne pas ajouter plusieurs IP pour le meme nom sur un meme poste.

## 2. Importer le certificat autosigne

Ouvrir PowerShell en administrateur et executer :

```powershell
certutil -addstore -f Root C:\chemin\vers\sigeda-preprod.cer
certutil -addstore -f CA C:\chemin\vers\sigeda-preprod.cer
certutil -addstore -f -user Root C:\chemin\vers\sigeda-preprod.cer
```

Remarque :

- le certificat importe doit correspondre au certificat effectivement servi par `nginx`
- si le certificat actif change, il faut redistribuer le nouveau fichier aux postes

## 3. Declarer l'exception proxy Windows

Ouvrir PowerShell et executer :

```powershell
$path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$current = (Get-ItemProperty $path).ProxyOverride
$entries = @()
if ($current) { $entries += $current -split ';' }
$entries += 'sigeda-preprod.hdm'
$entries += '*.hdm'
$entries += '172.16.10.88'
$entries += '<local>'
$entries = $entries | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() } | Select-Object -Unique
Set-ItemProperty $path -Name ProxyOverride -Value ($entries -join ';')
```

Option recommandee :

- preferer le script [Set-SigedaPreprodBrowserAccess.ps1](../infra/windows/Set-SigedaPreprodBrowserAccess.ps1) plutot qu'une modification manuelle isolee.

Controle :

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' | Select-Object ProxyEnable, ProxyServer, ProxyOverride
```

## 4. Vider les caches reseau locaux

Fermer les navigateurs puis executer :

```powershell
taskkill /IM chrome.exe /F
taskkill /IM msedge.exe /F
taskkill /IM firefox.exe /F
taskkill /IM opera.exe /F
ipconfig /flushdns
```

## 5. Reglage Firefox

Dans Firefox :

- ouvrir `about:config`
- positionner `security.enterprise_roots.enabled` a `true`

Si necessaire, importer aussi le certificat manuellement dans :

- `Parametres`
- `Vie privee et securite`
- `Certificats`
- `Afficher les certificats`
- `Autorites`

## 6. URL de test

Tester :

```txt
https://sigeda-preprod.hdm:3443/login
```

## 7. Verification rapide

Depuis PowerShell sur le poste client :

```powershell
nslookup sigeda-preprod.hdm
ping sigeda-preprod.hdm
curl.exe -I https://sigeda-preprod.hdm:3443/login
```

## 8. Checklist de validation poste client

- `hosts` contient `172.16.10.88 sigeda-preprod.hdm`
- le certificat autosigne est importe dans les magasins adequats
- `ProxyOverride` contient `sigeda-preprod.hdm`
- l'URL `https://sigeda-preprod.hdm:3443/login` s'ouvre
- l'authentification Keycloak aboutit
- le tableau de bord SIGEDA est atteint

## 9. Limites de cette approche

Cette approche est exploitable en preproduction, mais elle impose :

- une configuration poste par poste ;
- une redistribution manuelle si le certificat change ;
- une gestion manuelle des exceptions proxy.

La cible long terme reste :

- resolution DNS interne officielle ;
- exception proxy centralisee ;
- certificat emis par une autorite de confiance interne.
