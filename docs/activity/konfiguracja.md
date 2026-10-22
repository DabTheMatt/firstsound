# ACTIVITY 02 — synchronizacja metadanych Dysku Google

FIELD nie loguje się do Google. Przeglądarka nie dostaje tokenów, nie otwiera folderów i nie pobiera nagrań. Właściciel projektu uruchamia Apps Script na własnym koncie, skrypt czyta tylko metadane i zapisuje prywatny plik JSON. Ten plik trafia do FIELD ręcznie, jako statyczny zasób.

## Architektura

```
Google Drive
    |
    v
Google Apps Script  (konto właściciela)
    |
    v
Prywatny plik JSON  (field-activity-snapshot.json)
    |
    v
Ręczny eksport do public/activity/snapshot.json
    |
    v
FIELD ACTIVITY  (źródło static-snapshot)
```

Studenci nadal wgrywają nagrania do swoich istniejących folderów. Tego obiegu nie zmieniamy. Skrypt nie udostępnia folderów ani plików.

## Pliki

- `scripts/activity/driveSync.gs` — skrypt Apps Script.
- `scripts/activity/snapshot.schema.json` — kształt publicznego dokumentu.
- `src/activity/snapshot/validate.ts` — walidator używany przez FIELD przed pokazaniem danych.
- `src/activity/source.ts` — jawne źródło danych. Domyślnie `static-snapshot`.
- `public/activity/snapshot.json` — plik, który wkładasz po ręcznym eksporcie. Nie jest częścią tego etapu, dopóki go nie dodasz.

## Klasyfikacja plików

Skrypt nie pobiera i nie dekoduje audio. Decyzja jest wyłącznie z metadanych:

1. Plik tymczasowy (`~$…`, `~…`, `.tmp`, `.crdownload`, `.part`, `.download`, `.partial`, `thumbs.db`, `desktop.ini`, `.ds_store`) jest pomijany.
2. MIME `application/vnd.google-apps.*` (Dokumenty, Arkusze, skróty, foldery) jest pomijany.
3. Rozszerzenie z listy jest nagraniem, nawet gdy MIME jest puste albo błędne: `.wav`, `.aif`, `.aiff`, `.mp3`, `.m4a`, `.flac`, `.caf`, `.ogg`, `.webm`.
4. Znane rozszerzenie spoza tej listy (PDF, obraz, arkusz, `.mp4` wideo) jest pomijane, nawet gdy MIME mówi `audio/*`.
5. Brak rozszerzenia: wtedy liczy się znany MIME audio z listy obsługiwanych formatów. `audio/mp4` bez rozszerzenia jest traktowany jako `.m4a`.

`.webm` może być wideo. Bez dekodowania skrypt nie odróżni go od audio. To ograniczenie jest świadome.

## Tożsamość uczestnika

Jednostką jest podfolder katalogu nadrzędnego. Identyfikator w publicznym JSON to `stu_` i 16 pierwszych znaków hex SHA-256 z prefiksem `field-activity-student-v1:`. To nie jest identyfikator folderu i nie otwiera Dysku.

Nazwa folderu nie jest kluczem i domyślnie nie jest publikowana. Nazwa wyświetlana bierze się z mapy `ACTIVITY_DISPLAY_NAMES`. Bez mapy skrypt nadaje stabilny pseudonim `Student` i krótki fragment publicznego identyfikatora. Adres e-mail w mapie jest odrzucany.

`ACTIVITY_PUBLISH_FOLDER_NAMES=true` publikuje surowe nazwy folderów. Zostaw `false`, dopóki świadomie tego nie zatwierdzisz.

Pliki leżące bezpośrednio w katalogu nadrzędnym nie są nagraniami. W pierwszej wersji skan obejmuje tylko pliki wprost w folderze uczestnika. Zagnieżdżone katalogi są czytane wyłącznie, gdy `ACTIVITY_SCAN_NESTED=true`.

Foldery administracyjne wpisz do wykluczeń. Inaczej staną się pseudonimicznymi uczestnikami.

## Reguły agregacji

Strefa: `Europe/Warsaw`.

Nowe wgranie to data kalendarzowa pola Drive `createdTime`. `modifiedTime` jest czytane wewnętrznie i nie przesuwa dnia ani licznika „ostatnie 7 / 30 dni”.

Okno 7 i 30 dni obejmuje dzień synchronizacji i poprzednie dni kalendarza warszawskiego, włącznie z końcami.

Aktywny uczestnik ma `lastActivityAt` w ostatnich 7 dniach warszawskich. `lastActivityAt` to najpóźniejszy `createdTime`, nie data z nazwy pliku.

Brak `createdTime`: plik nie wchodzi do opublikowanych liczników. W diagnostyce zostaje sam kod `missing-created-time`, bez nazwy i bez identyfikatora. Synchronizacja może być kompletna.

Brak rozmiaru: plik wchodzi do liczby nagrań z rozmiarem 0 i kodem `missing-size`.

Czas trwania nie jest liczony i nie jest publikowany.

`dailyActivity` zawiera tylko dni z co najmniej jednym wgraniem. Suma tych liczników jest równa `totalRecordings`.

`generatedAt` i `lastSynchronizationAt` są tym samym znacznikiem udanej, kompletnej synchronizacji.

## Schemat publiczny

Dozwolone pola:

- `schemaVersion` — `1`
- `generatedAt`
- `timezone` — `Europe/Warsaw`
- `activityBasis` — `createdTime`
- `synchronization.status` — tylko `complete`
- `synchronization.lastSynchronizationAt`
- `project.totalStudents`
- `project.activeStudents`
- `project.totalRecordings`
- `project.totalBytes`
- `project.recordingsLast7Days`
- `project.recordingsLast30Days`
- `project.lastSynchronizationAt`
- `students[].studentId`
- `students[].displayName`
- `students[].recordingCount`
- `students[].totalBytes`
- `students[].lastActivityAt`
- `dailyActivity[].date`
- `dailyActivity[].count`

Każde inne pole, status inny niż `complete` albo sumy niezgodne z wierszami są odrzucane. FIELD nie pokazuje wtedy danych demonstracyjnych.

## Harmonogram

Funkcja wyzwalacza: `syncActivitySnapshot`.

Instalacja jednego wyzwalacza: uruchom `installActivitySync` z edytora. Kolejne uruchomienie kasuje poprzednie wyzwalacze tej funkcji i zakłada jeden. Domyślny odstęp to 60 minut (`everyHours(1)`).

Dozwolone wartości `ACTIVITY_INTERVAL_MINUTES`: `1`, `5`, `10`, `15`, `30`, `60`, `120`, `240`, `360`, `480`, `720`, `1440`.

`LockService` blokuje nakładające się przebiegi. Gdy blokada jest zajęta, skrypt zapisuje diagnostykę `overlap` i nie publikuje nowego zestawu.

Budżet czasu to `ACTIVITY_MAX_RUNTIME_MS`, domyślnie 300000 ms, poniżej limitu Apps Script. Gdy skan nie zdąży, diagnostyka dostaje `time-limit`, a poprzedni kompletny plik zostaje. Częściowy skan nie jest publikowany jako kompletny.

## Instalacja Apps Script

1. Otwórz [script.google.com](https://script.google.com) na koncie, które widzi cały katalog nagrań.
2. Utwórz projekt i wklej `scripts/activity/driveSync.gs`.
3. W ustawieniach projektu dodaj właściwości skryptu. Nie wpisuj adresu e-mail właściciela. Skrypt go nie czyta.

| Właściwość | Znaczenie |
| --- | --- |
| `ACTIVITY_ROOT_FOLDER_ID` | Identyfikator katalogu nadrzędnego. Wymagany. |
| `ACTIVITY_EXCLUDED_FOLDER_IDS` | JSON, tablica identyfikatorów folderów do pominięcia. |
| `ACTIVITY_EXCLUDED_FOLDER_NAMES` | JSON, tablica nazw administracyjnych, bez wielkości liter. |
| `ACTIVITY_DISPLAY_NAMES` | JSON, obiekt `identyfikatorFolderu: "Pseudonim"`. |
| `ACTIVITY_PUBLISH_FOLDER_NAMES` | `false`, dopóki świadomie nie zatwierdzisz nazw folderów. |
| `ACTIVITY_SCAN_NESTED` | `false` w pierwszej wersji. |
| `ACTIVITY_NESTED_DEPTH` | Głębokość poniżej folderu uczestnika, gdy zagnieżdżanie jest włączone. Domyślnie `2`. |
| `ACTIVITY_INTERVAL_MINUTES` | Domyślnie `60`. |
| `ACTIVITY_MAX_RUNTIME_MS` | Domyślnie `300000`. |

4. Uruchom `installActivitySync` i zatwierdź uprawnienie Dysku dla tego skryptu.
5. Uruchom `syncActivitySnapshot`.
6. W Mojim dysku pojawią się dwa prywatne pliki: `field-activity-snapshot.json` i `field-activity-diagnostics.json`. Nie udostępniaj ich. Skrypt nie wywołuje zmiany udostępniania.
7. Pobierz snapshot na swój komputer.
8. Sprawdź, że walidacja w skrypcie zakończyła się logiem `activity-sync-complete`. Diagnostyka może zawierać liczniki kodów, bez nazw i identyfikatorów.
9. Włóż plik do repozytorium jako `public/activity/snapshot.json`.
10. FIELD czyta go jako zasób statyczny. Źródło w `src/activity/source.ts` zostaje `static-snapshot`.

Zmiana na `demo` w tym pliku jest jawną konfiguracją danych przykładowych. Brak pliku, zły JSON i zestaw odrzucony przez walidator zostają błędem. Ekran nie podstawia wtedy danych demonstracyjnych.

Zestaw starszy niż trzy godziny (trzy pominięte cykle 60-minutowe) zostaje na ekranie. Widać czas ostatniej udanej synchronizacji i oznaczenie, że zestaw jest starszy niż oczekiwane odświeżenie. „Dzisiaj” na wykresie to dzień synchronizacji, nie godzina otwarcia strony.

## Lista kontrolna prywatności

- [ ] Katalog Dysku zostaje prywatny.
- [ ] Skrypt nie wywołuje udostępniania plików ani folderów.
- [ ] W kodzie klienta nie ma tokenu GitHub, tokenu Google ani sekretu OAuth.
- [ ] FIELD nie ma logowania Google.
- [ ] Publiczny JSON nie zawiera adresów e-mail.
- [ ] Publiczny JSON nie zawiera surowych identyfikatorów folderów i plików.
- [ ] Publiczny JSON nie zawiera nazw plików.
- [ ] Publiczny JSON nie zawiera adresów `drive.google.com` ani `docs.google.com`.
- [ ] Nazwy folderów nie są publikowane, dopóki `ACTIVITY_PUBLISH_FOLDER_NAMES` nie jest świadomie `true`.
- [ ] Mapa pseudonimów nie zawiera adresów e-mail.
- [ ] Foldery administracyjne są na liście wykluczeń.
- [ ] Diagnostyka ma kody i liczniki, bez nazw i identyfikatorów.
- [ ] Niekompletny skan nie zastępuje ostatniego kompletnego zestawu.
- [ ] Na ekranie widać źródło i czas synchronizacji.
- [ ] Błąd odczytu zestawu nie pokazuje danych demonstracyjnych.

## Publikacja automatyczna

Apps Script dalej zapisuje tylko prywatny `field-activity-snapshot.json`. Nie woła GitHuba. Automatyczne odświeżanie jest wyłączone. Workflow `.github/workflows/activity-publish.yml` nie ma harmonogramu. Uruchamia się ręcznie, pobiera ten jeden plik kontem usługi, uruchamia `validatePublicSnapshot` i commituje wyłącznie `public/activity/snapshot.json`, gdy zestaw jest poprawny i różni się od pliku na `main`. Zły JSON, niekompletny skan i błąd pobrania nie podmieniają ostatniego dobrego pliku. Push uruchamia dotychczasowy workflow GitHub Pages.

Sekrety są tylko w GitHub Actions: `ACTIVITY_DRIVE_CREDENTIALS`, `ACTIVITY_SNAPSHOT_FILE_ID` i `ACTIVITY_COMMIT_TOKEN`. Nie ma ich w kodzie FIELD ani w przeglądarce. Konto usługi ma dostęp Viewer wyłącznie do pliku snapshotu. Folder nagrań zostaje prywatny.
