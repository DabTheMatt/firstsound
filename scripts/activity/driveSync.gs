/**
 * FIELD activity metadata sync.
 *
 * Runs as the project owner inside Google Apps Script.
 * Reads Drive file metadata only. It does not download audio, does not
 * decode audio, and does not change sharing. File type comes from the
 * extension and MIME metadata. MIME is not assumed to be correct: a
 * supported extension wins, and a Google Docs MIME type is never audio.
 *
 * Daily counts use the Europe/Warsaw calendar date of Drive createdTime.
 * modifiedTime is not a new upload.
 *
 * The public snapshot is an allowlist. Folder ids, file ids, filenames,
 * and email addresses stay out of it. Setup: docs/activity/konfiguracja.md
 */

var ACTIVITY_SCHEMA_VERSION = 1;
var ACTIVITY_TIMEZONE = 'Europe/Warsaw';
var ACTIVITY_HASH_PREFIX = 'field-activity-student-v1:';
var ACTIVITY_AUDIO_EXTENSIONS = {
  wav: true,
  aif: true,
  aiff: true,
  mp3: true,
  m4a: true,
  flac: true,
  caf: true,
  ogg: true,
  webm: true
};
var ACTIVITY_AUDIO_MIME = {
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/vnd.wave': 'wav',
  'audio/aiff': 'aiff',
  'audio/x-aiff': 'aiff',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/x-caf': 'caf',
  'audio/caf': 'caf',
  'audio/ogg': 'ogg',
  'application/ogg': 'ogg',
  'audio/vorbis': 'ogg',
  'audio/webm': 'webm',
  'video/webm': 'webm'
};
var ACTIVITY_NON_AUDIO_EXTENSIONS = {
  pdf: true,
  png: true,
  jpg: true,
  jpeg: true,
  gif: true,
  webp: true,
  svg: true,
  doc: true,
  docx: true,
  xls: true,
  xlsx: true,
  ppt: true,
  pptx: true,
  txt: true,
  csv: true,
  zip: true,
  json: true,
  html: true,
  htm: true,
  md: true,
  rtf: true,
  heic: true,
  tif: true,
  tiff: true,
  mov: true,
  mp4: true
};

function sha256Hex(text) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < raw.length; i++) {
    var value = raw[i];
    if (value < 0) value += 256;
    var hex = value.toString(16);
    if (hex.length < 2) hex = '0' + hex;
    out += hex;
  }
  return out;
}

function publicStudentId(folderId) {
  return 'stu_' + sha256Hex(ACTIVITY_HASH_PREFIX + folderId).substring(0, 16);
}

function warsawDate(iso) {
  var ms = Date.parse(iso);
  if (!isFinite(ms)) return null;
  return Utilities.formatDate(new Date(ms), ACTIVITY_TIMEZONE, 'yyyy-MM-dd');
}

function addDays_(ymd, delta) {
  var parts = ymd.split('-');
  var utc = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) + delta * 86400000;
  return Utilities.formatDate(new Date(utc), 'UTC', 'yyyy-MM-dd');
}

function calendarWindow_(days, iso) {
  var end = warsawDate(iso);
  if (!end) return null;
  return { start: addDays_(end, -(days - 1)), end: end };
}

function mimeBase_(mime) {
  return String(mime || '').split(';')[0].replace(/^\s+|\s+$/g, '').toLowerCase();
}

function fileExtension_(filename) {
  var base = String(filename || '').split(/[/\\]/).pop();
  var dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.substring(dot + 1).toLowerCase();
}

function isTemporary_(filename) {
  var name = String(filename || '').replace(/^\s+|\s+$/g, '').toLowerCase();
  if (!name) return true;
  if (name.indexOf('~$') === 0) return true;
  if (name.charAt(0) === '~') return true;
  if (name === '.ds_store' || name === 'thumbs.db' || name === 'desktop.ini') return true;
  return /\.(tmp|temp|crdownload|part|download|partial)$/.test(name);
}

/**
 * Metadata classification. Does not read or decode bytes.
 * A supported extension is enough. An unsupported extension is ignored
 * even when MIME says audio. Google editor files are never audio.
 */
function classifyDriveFile(file) {
  var filename = file && file.filename ? String(file.filename) : '';
  var mime = mimeBase_(file && file.mimeType);
  if (file && file.isFolder) return { kind: 'ignore', reason: 'folder' };
  if (mime === 'application/vnd.google-apps.folder') return { kind: 'ignore', reason: 'folder' };
  if (isTemporary_(filename)) return { kind: 'ignore', reason: 'temporary' };
  if (mime.indexOf('application/vnd.google-apps.') === 0) return { kind: 'ignore', reason: 'google-app' };
  var extension = fileExtension_(filename);
  if (ACTIVITY_AUDIO_EXTENSIONS[extension]) return { kind: 'audio', extension: extension };
  if (extension && ACTIVITY_NON_AUDIO_EXTENSIONS[extension]) return { kind: 'ignore', reason: 'unsupported' };
  if (ACTIVITY_AUDIO_MIME[mime]) return { kind: 'audio', extension: ACTIVITY_AUDIO_MIME[mime] };
  return { kind: 'ignore', reason: 'unsupported' };
}

function isIso_(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  return isFinite(Date.parse(value));
}

function isCount_(value) {
  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value && value >= 0 && value <= 9007199254740991;
}

function isYmd_(value) {
  if (typeof value !== 'string' || !/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) return false;
  var parts = value.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var day = Number(parts[2]);
  var utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function isPublicName_(value) {
  if (typeof value !== 'string') return false;
  var text = value.replace(/^\s+|\s+$/g, '');
  if (!text || text.length > 80) return false;
  if (text.indexOf('@') !== -1) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/drive\.google\.com/i.test(text)) return false;
  if (/docs\.google\.com/i.test(text)) return false;
  if (/ya29\./i.test(text)) return false;
  for (var i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) < 32) return false;
  }
  return true;
}

function isExcluded_(folderId, folderName, config) {
  var ids = config.excludedFolderIds || [];
  for (var i = 0; i < ids.length; i++) {
    if (ids[i] === folderId) return true;
  }
  var names = config.excludedFolderNames || [];
  var needle = String(folderName || '').replace(/^\s+|\s+$/g, '').toLowerCase();
  if (!needle) return false;
  for (var n = 0; n < names.length; n++) {
    if (String(names[n] || '').replace(/^\s+|\s+$/g, '').toLowerCase() === needle) return true;
  }
  return false;
}

function pseudonym_(studentId, used) {
  var shortName = 'Student ' + studentId.substring(4, 8);
  if (!used[shortName]) {
    used[shortName] = true;
    return shortName;
  }
  var longer = 'Student ' + studentId.substring(4, 12);
  used[longer] = true;
  return longer;
}

function resolveDisplayName_(folder, studentId, config, counts, used) {
  var map = config.displayNames || {};
  var mapped = map[folder.folderId];
  if (typeof mapped === 'string' && isPublicName_(mapped)) return mapped.replace(/^\s+|\s+$/g, '');
  if (typeof mapped === 'string') counts['rejected-display-name']++;
  if (config.publishFolderNames === true && isPublicName_(folder.folderName)) {
    return String(folder.folderName).replace(/^\s+|\s+$/g, '');
  }
  if (config.publishFolderNames === true) counts['rejected-display-name']++;
  return pseudonym_(studentId, used);
}

function emptyCounts_() {
  return {
    'missing-created-time': 0,
    'missing-size': 0,
    'rejected-display-name': 0,
    'duplicate-file': 0,
    'ignored-file': 0,
    'unreadable-file': 0
  };
}

function incomplete_(code) {
  return {
    status: 'incomplete',
    code: code,
    recordedAt: new Date().toISOString(),
    counts: emptyCounts_(),
    foldersScanned: 0,
    filesSeen: 0,
    audioFiles: 0
  };
}

/**
 * Build a public snapshot from an already finished folder listing.
 * Undated audio is omitted from the counts and recorded as a diagnostic.
 * A partial listing must not be passed here.
 */
function aggregateDriveMetadata(input) {
  var built = buildSnapshot_(input || {});
  var validation = validatePublicSnapshot(built.snapshot);
  if (!validation.ok) {
    return {
      snapshot: null,
      diagnostics: {
        status: 'incomplete',
        code: 'invalid-snapshot',
        recordedAt: input && input.syncedAt ? input.syncedAt : new Date().toISOString(),
        counts: built.diagnostics.counts,
        foldersScanned: built.diagnostics.foldersScanned,
        filesSeen: built.diagnostics.filesSeen,
        audioFiles: built.diagnostics.audioFiles
      }
    };
  }
  built.diagnostics.status = 'complete';
  built.diagnostics.code = 'ok';
  return { snapshot: validation.snapshot, diagnostics: built.diagnostics };
}

function buildSnapshot_(input) {
  var config = input.config || {};
  var syncedAt = input.syncedAt;
  var counts = emptyCounts_();
  var folders = input.folders || [];
  var included = [];
  for (var i = 0; i < folders.length; i++) {
    var folder = folders[i];
    if (!folder || !folder.folderId) continue;
    if (isExcluded_(folder.folderId, folder.folderName, config)) continue;
    included.push(folder);
  }
  var folderById = {};
  for (var f = 0; f < included.length; f++) folderById[included[f].folderId] = included[f];

  var seenFiles = {};
  var accepted = [];
  var files = input.files || [];
  for (var p = 0; p < files.length; p++) {
    var file = files[p];
    if (!file || !folderById[file.folderId]) continue;
    if (!file.fileId) {
      counts['unreadable-file']++;
      continue;
    }
    if (seenFiles[file.fileId]) {
      counts['duplicate-file']++;
      continue;
    }
    seenFiles[file.fileId] = true;
    var classified = classifyDriveFile(file);
    if (classified.kind !== 'audio') {
      counts['ignored-file']++;
      continue;
    }
    var created = isIso_(file.createdTime) ? file.createdTime : null;
    var day = created ? warsawDate(created) : null;
    if (!day) {
      counts['missing-created-time']++;
      continue;
    }
    var size = isCount_(file.sizeBytes) ? file.sizeBytes : null;
    if (size === null) {
      counts['missing-size']++;
      size = 0;
    }
    accepted.push({ folderId: file.folderId, createdTime: created, sizeBytes: size, day: day });
  }

  var byFolder = {};
  var dailyMap = {};
  var dailyStudents = {};
  for (var a = 0; a < accepted.length; a++) {
    var item = accepted[a];
    if (!byFolder[item.folderId]) byFolder[item.folderId] = { count: 0, bytes: 0, last: null };
    var bucket = byFolder[item.folderId];
    bucket.count++;
    bucket.bytes += item.sizeBytes;
    if (!bucket.last || Date.parse(item.createdTime) > Date.parse(bucket.last)) bucket.last = item.createdTime;
    dailyMap[item.day] = (dailyMap[item.day] || 0) + 1;
    var owner = publicStudentId(item.folderId);
    if (!dailyStudents[item.day]) dailyStudents[item.day] = {};
    dailyStudents[item.day][owner] = (dailyStudents[item.day][owner] || 0) + 1;
  }

  var folderByStudent = {};
  var students = [];
  for (var s = 0; s < included.length; s++) {
    var source = included[s];
    var studentId = publicStudentId(source.folderId);
    folderByStudent[studentId] = source;
    var stats = byFolder[source.folderId] || { count: 0, bytes: 0, last: null };
    students.push({
      studentId: studentId,
      displayName: '',
      recordingCount: stats.count,
      totalBytes: stats.bytes,
      lastActivityAt: stats.last
    });
  }
  students.sort(function (left, right) {
    if (left.studentId < right.studentId) return -1;
    if (left.studentId > right.studentId) return 1;
    return 0;
  });
  var usedNames = {};
  for (var n = 0; n < students.length; n++) {
    students[n].displayName = resolveDisplayName_(folderByStudent[students[n].studentId], students[n].studentId, config, counts, usedNames);
  }

  var dayKeys = Object.keys(dailyMap);
  dayKeys.sort();
  var dailyActivity = [];
  for (var d = 0; d < dayKeys.length; d++) {
    var owners = dailyStudents[dayKeys[d]] || {};
    var ownerIds = Object.keys(owners);
    ownerIds.sort();
    var parts = [];
    for (var b = 0; b < ownerIds.length; b++) parts.push({ studentId: ownerIds[b], count: owners[ownerIds[b]] });
    dailyActivity.push({ date: dayKeys[d], count: dailyMap[dayKeys[d]], byStudent: parts });
  }

  var totalRecordings = 0;
  var totalBytes = 0;
  for (var t = 0; t < students.length; t++) {
    totalRecordings += students[t].recordingCount;
    totalBytes += students[t].totalBytes;
  }
  var week = calendarWindow_(7, syncedAt);
  var month = calendarWindow_(30, syncedAt);
  var last7 = 0;
  var last30 = 0;
  for (var u = 0; u < dailyActivity.length; u++) {
    if (week && dailyActivity[u].date >= week.start && dailyActivity[u].date <= week.end) last7 += dailyActivity[u].count;
    if (month && dailyActivity[u].date >= month.start && dailyActivity[u].date <= month.end) last30 += dailyActivity[u].count;
  }
  var activeStudents = 0;
  for (var v = 0; v < students.length; v++) {
    if (!students[v].lastActivityAt) continue;
    var activeDay = warsawDate(students[v].lastActivityAt);
    if (week && activeDay && activeDay >= week.start && activeDay <= week.end) activeStudents++;
  }

  return {
    snapshot: {
      schemaVersion: ACTIVITY_SCHEMA_VERSION,
      generatedAt: syncedAt,
      timezone: ACTIVITY_TIMEZONE,
      activityBasis: 'createdTime',
      synchronization: { status: 'complete', lastSynchronizationAt: syncedAt },
      project: {
        totalStudents: students.length,
        activeStudents: activeStudents,
        totalRecordings: totalRecordings,
        totalBytes: totalBytes,
        recordingsLast7Days: last7,
        recordingsLast30Days: last30,
        lastSynchronizationAt: syncedAt
      },
      students: students,
      dailyActivity: dailyActivity
    },
    diagnostics: {
      status: 'complete',
      code: 'ok',
      recordedAt: syncedAt,
      counts: counts,
      foldersScanned: included.length,
      filesSeen: files.length,
      audioFiles: accepted.length
    }
  };
}

function exactKeys_(value, allowed) {
  if (!value || typeof value !== 'object' || Object.prototype.toString.call(value) !== '[object Object]') return false;
  var keys = Object.keys(value);
  if (keys.length !== allowed.length) return false;
  for (var i = 0; i < allowed.length; i++) {
    if (keys.indexOf(allowed[i]) === -1) return false;
  }
  return true;
}

function readByStudent_(point, seenStudents, contributed) {
  if (!Array.isArray(point.byStudent) || point.byStudent.length === 0) return null;
  var parts = [];
  var sum = 0;
  var previousId = '';
  for (var i = 0; i < point.byStudent.length; i++) {
    var item = point.byStudent[i];
    if (!exactKeys_(item, ['studentId', 'count'])) return null;
    if (typeof item.studentId !== 'string' || !seenStudents[item.studentId]) return null;
    if (!isCount_(item.count) || item.count < 1) return null;
    if (item.studentId <= previousId) return null;
    previousId = item.studentId;
    sum += item.count;
    contributed[item.studentId] = (contributed[item.studentId] || 0) + item.count;
    parts.push({ studentId: item.studentId, count: item.count });
  }
  if (sum !== point.count) return null;
  return parts;
}

function validatePublicSnapshot(input) {
  if (!exactKeys_(input, ['schemaVersion', 'generatedAt', 'timezone', 'activityBasis', 'synchronization', 'project', 'students', 'dailyActivity'])) {
    return { ok: false, errors: ['extra-field'] };
  }
  if (input.schemaVersion !== 1) return { ok: false, errors: ['schema-version'] };
  if (input.timezone !== ACTIVITY_TIMEZONE) return { ok: false, errors: ['timezone'] };
  if (input.activityBasis !== 'createdTime') return { ok: false, errors: ['activity-basis'] };
  if (!isIso_(input.generatedAt)) return { ok: false, errors: ['generated-at'] };
  if (!exactKeys_(input.synchronization, ['status', 'lastSynchronizationAt'])) return { ok: false, errors: ['synchronization'] };
  if (input.synchronization.status !== 'complete') return { ok: false, errors: ['incomplete'] };
  if (!isIso_(input.synchronization.lastSynchronizationAt)) return { ok: false, errors: ['last-sync'] };
  if (input.synchronization.lastSynchronizationAt !== input.generatedAt) return { ok: false, errors: ['generated-at'] };
  if (!exactKeys_(input.project, ['totalStudents', 'activeStudents', 'totalRecordings', 'totalBytes', 'recordingsLast7Days', 'recordingsLast30Days', 'lastSynchronizationAt'])) {
    return { ok: false, errors: ['project'] };
  }
  var project = input.project;
  if (!isCount_(project.totalStudents) || !isCount_(project.activeStudents) || !isCount_(project.totalRecordings) || !isCount_(project.totalBytes) || !isCount_(project.recordingsLast7Days) || !isCount_(project.recordingsLast30Days)) {
    return { ok: false, errors: ['project-field'] };
  }
  if (project.lastSynchronizationAt !== input.synchronization.lastSynchronizationAt) return { ok: false, errors: ['last-sync'] };
  if (!Array.isArray(input.students) || !Array.isArray(input.dailyActivity)) return { ok: false, errors: ['snapshot'] };

  var students = [];
  var seenStudents = {};
  for (var i = 0; i < input.students.length; i++) {
    var row = input.students[i];
    if (!exactKeys_(row, ['studentId', 'displayName', 'recordingCount', 'totalBytes', 'lastActivityAt'])) {
      return { ok: false, errors: ['student-field'] };
    }
    if (typeof row.studentId !== 'string' || !/^stu_[a-f0-9]{16}$/.test(row.studentId)) return { ok: false, errors: ['student-id'] };
    if (seenStudents[row.studentId]) return { ok: false, errors: ['duplicate-student'] };
    seenStudents[row.studentId] = true;
    if (!isPublicName_(row.displayName)) return { ok: false, errors: ['display-name'] };
    if (!isCount_(row.recordingCount) || !isCount_(row.totalBytes)) return { ok: false, errors: ['student-field'] };
    if (row.lastActivityAt !== null && !isIso_(row.lastActivityAt)) return { ok: false, errors: ['last-activity'] };
    if (row.recordingCount === 0 && row.lastActivityAt !== null) return { ok: false, errors: ['last-activity'] };
    if (row.recordingCount > 0 && row.lastActivityAt === null) return { ok: false, errors: ['last-activity'] };
    students.push({
      studentId: row.studentId,
      displayName: String(row.displayName).replace(/^\s+|\s+$/g, ''),
      recordingCount: row.recordingCount,
      totalBytes: row.totalBytes,
      lastActivityAt: row.lastActivityAt
    });
  }

  var daily = [];
  var seenDays = {};
  var previous = '';
  var split = null;
  var contributed = {};
  for (var d = 0; d < input.dailyActivity.length; d++) {
    var point = input.dailyActivity[d];
    var shape = exactKeys_(point, ['date', 'count']) ? 'plain' : (exactKeys_(point, ['date', 'count', 'byStudent']) ? 'split' : '');
    if (!shape) return { ok: false, errors: ['daily-field'] };
    if (split === null) split = shape;
    else if (split !== shape) return { ok: false, errors: ['daily-field'] };
    if (!isYmd_(point.date) || !isCount_(point.count) || point.count < 1) return { ok: false, errors: ['daily-date'] };
    if (seenDays[point.date] || (previous && point.date <= previous)) return { ok: false, errors: ['daily-date'] };
    seenDays[point.date] = true;
    previous = point.date;
    var entry = { date: point.date, count: point.count };
    if (shape === 'split') {
      var parts = readByStudent_(point, seenStudents, contributed);
      if (!parts) return { ok: false, errors: ['daily-field'] };
      entry.byStudent = parts;
    }
    daily.push(entry);
  }

  for (var s = 0; s < students.length; s++) {
    if (!students[s].lastActivityAt) continue;
    var activityDay = warsawDate(students[s].lastActivityAt);
    if (!activityDay || !seenDays[activityDay]) return { ok: false, errors: ['last-activity'] };
  }

  var totalRecordings = 0;
  var totalBytes = 0;
  for (var t = 0; t < students.length; t++) {
    totalRecordings += students[t].recordingCount;
    totalBytes += students[t].totalBytes;
  }
  var dailyTotal = 0;
  for (var c = 0; c < daily.length; c++) dailyTotal += daily[c].count;
  if (students.length !== project.totalStudents) return { ok: false, errors: ['total-students'] };
  if (totalRecordings !== project.totalRecordings || dailyTotal !== project.totalRecordings) return { ok: false, errors: ['sum-recordings'] };
  if (split === 'split') {
    for (var studentIndex = 0; studentIndex < students.length; studentIndex++) {
      var expected = students[studentIndex].recordingCount;
      var got = contributed[students[studentIndex].studentId] || 0;
      if (got !== expected) return { ok: false, errors: ['sum-recordings'] };
    }
  }
  if (totalBytes !== project.totalBytes) return { ok: false, errors: ['sum-bytes'] };

  var week = calendarWindow_(7, input.synchronization.lastSynchronizationAt);
  var month = calendarWindow_(30, input.synchronization.lastSynchronizationAt);
  if (!week || !month) return { ok: false, errors: ['last-sync'] };
  var last7 = 0;
  var last30 = 0;
  var active = 0;
  for (var w = 0; w < daily.length; w++) {
    if (daily[w].date >= week.start && daily[w].date <= week.end) last7 += daily[w].count;
    if (daily[w].date >= month.start && daily[w].date <= month.end) last30 += daily[w].count;
  }
  for (var a = 0; a < students.length; a++) {
    if (!students[a].lastActivityAt) continue;
    var activeDay = warsawDate(students[a].lastActivityAt);
    if (activeDay && activeDay >= week.start && activeDay <= week.end) active++;
  }
  if (last7 !== project.recordingsLast7Days) return { ok: false, errors: ['recordings-last-7'] };
  if (last30 !== project.recordingsLast30Days) return { ok: false, errors: ['recordings-last-30'] };
  if (active !== project.activeStudents) return { ok: false, errors: ['active-students'] };

  return {
    ok: true,
    snapshot: {
      schemaVersion: 1,
      generatedAt: input.generatedAt,
      timezone: ACTIVITY_TIMEZONE,
      activityBasis: 'createdTime',
      synchronization: {
        status: 'complete',
        lastSynchronizationAt: input.synchronization.lastSynchronizationAt
      },
      project: {
        totalStudents: project.totalStudents,
        activeStudents: project.activeStudents,
        totalRecordings: project.totalRecordings,
        totalBytes: project.totalBytes,
        recordingsLast7Days: project.recordingsLast7Days,
        recordingsLast30Days: project.recordingsLast30Days,
        lastSynchronizationAt: input.synchronization.lastSynchronizationAt
      },
      students: students,
      dailyActivity: daily
    }
  };
}

function readJsonProperty_(props, key, fallback) {
  var raw = props.getProperty(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function readRuntimeMs_(props) {
  var raw = props.getProperty('ACTIVITY_MAX_RUNTIME_MS');
  if (!raw) return 300000;
  var value = Number(raw);
  if (!isFinite(value) || value < 0) return 300000;
  return Math.floor(value);
}

function readPositiveInt_(props, key, fallback) {
  var raw = props.getProperty(key);
  if (!raw) return fallback;
  var value = Number(raw);
  if (!isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function readConfig_() {
  var props = PropertiesService.getScriptProperties();
  var displayNames = readJsonProperty_(props, 'ACTIVITY_DISPLAY_NAMES', {});
  if (!displayNames || typeof displayNames !== 'object' || Array.isArray(displayNames)) displayNames = {};
  return {
    rootFolderId: props.getProperty('ACTIVITY_ROOT_FOLDER_ID') || '',
    excludedFolderIds: readJsonProperty_(props, 'ACTIVITY_EXCLUDED_FOLDER_IDS', []),
    excludedFolderNames: readJsonProperty_(props, 'ACTIVITY_EXCLUDED_FOLDER_NAMES', []),
    displayNames: displayNames,
    publishFolderNames: props.getProperty('ACTIVITY_PUBLISH_FOLDER_NAMES') === 'true',
    scanNested: props.getProperty('ACTIVITY_SCAN_NESTED') === 'true',
    nestedDepth: readPositiveInt_(props, 'ACTIVITY_NESTED_DEPTH', 2),
    intervalMinutes: readPositiveInt_(props, 'ACTIVITY_INTERVAL_MINUTES', 60),
    maxRuntimeMs: readRuntimeMs_(props)
  };
}

function outOfTime_(startedAt, maxRuntimeMs) {
  return Date.now() - startedAt >= maxRuntimeMs;
}

function readFile_(file, folderId) {
  var record = {
    folderId: folderId,
    fileId: '',
    filename: '',
    mimeType: '',
    sizeBytes: null,
    createdTime: null,
    modifiedTime: null
  };
  try { record.fileId = file.getId(); } catch (err) { record.fileId = ''; }
  try { record.filename = file.getName(); } catch (err) { record.filename = ''; }
  try { record.mimeType = file.getMimeType(); } catch (err) { record.mimeType = ''; }
  try {
    var size = file.getSize();
    record.sizeBytes = isCount_(size) ? size : null;
  } catch (err) {
    record.sizeBytes = null;
  }
  try {
    var created = file.getDateCreated();
    record.createdTime = created && created.toISOString ? created.toISOString() : null;
  } catch (err) {
    record.createdTime = null;
  }
  try {
    var modified = file.getLastUpdated();
    record.modifiedTime = modified && modified.toISOString ? modified.toISOString() : null;
  } catch (err) {
    record.modifiedTime = null;
  }
  return record;
}

function collectFiles_(folder, studentFolderId, depth, config, startedAt) {
  var files = [];
  var seen = 0;
  if (outOfTime_(startedAt, config.maxRuntimeMs)) return { complete: false, files: [], filesSeen: 0 };
  var it = folder.getFiles();
  while (it.hasNext()) {
    if (outOfTime_(startedAt, config.maxRuntimeMs)) return { complete: false, files: [], filesSeen: seen };
    seen++;
    files.push(readFile_(it.next(), studentFolderId));
  }
  if (config.scanNested === true && depth < config.nestedDepth) {
    var children = folder.getFolders();
    while (children.hasNext()) {
      var nested = collectFiles_(children.next(), studentFolderId, depth + 1, config, startedAt);
      if (!nested.complete) return { complete: false, files: [], filesSeen: seen };
      files = files.concat(nested.files);
      seen += nested.filesSeen;
    }
  }
  return { complete: true, files: files, filesSeen: seen };
}

function scanDrive_(config, startedAt) {
  if (outOfTime_(startedAt, config.maxRuntimeMs)) {
    return { status: 'incomplete', folders: [], files: [], diagnostics: incomplete_('time-limit') };
  }
  var root = DriveApp.getFolderById(config.rootFolderId);
  var folders = [];
  var files = [];
  var folderIt = root.getFolders();
  while (folderIt.hasNext()) {
    if (outOfTime_(startedAt, config.maxRuntimeMs)) {
      return { status: 'incomplete', folders: [], files: [], diagnostics: incomplete_('time-limit') };
    }
    var folder = folderIt.next();
    var folderId = '';
    var folderName = '';
    try { folderId = folder.getId(); } catch (err) { continue; }
    try { folderName = folder.getName(); } catch (err) { folderName = ''; }
    if (isExcluded_(folderId, folderName, config)) continue;
    var collected = collectFiles_(folder, folderId, 0, config, startedAt);
    if (!collected.complete) {
      return { status: 'incomplete', folders: [], files: [], diagnostics: incomplete_('time-limit') };
    }
    folders.push({ folderId: folderId, folderName: folderName });
    files = files.concat(collected.files);
  }
  return { status: 'complete', folders: folders, files: files, diagnostics: incomplete_('ok') };
}

function writeNamedJson_(propertyKey, filename, json) {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty(propertyKey);
  if (existingId) {
    try {
      DriveApp.getFileById(existingId).setContent(json);
      return;
    } catch (err) {
      // The previous private file is gone. Create another private file.
    }
  }
  var created = DriveApp.createFile(filename, json, 'application/json');
  props.setProperty(propertyKey, created.getId());
}

function writePrivateSnapshot_(json) {
  writeNamedJson_('ACTIVITY_EXPORT_FILE_ID', 'field-activity-snapshot.json', json);
}

function writeDiagnostics_(diagnostics) {
  writeNamedJson_('ACTIVITY_DIAGNOSTICS_FILE_ID', 'field-activity-diagnostics.json', JSON.stringify(diagnostics));
}

function publishIfValid_(snapshot) {
  var validation = validatePublicSnapshot(snapshot);
  if (!validation.ok) {
    writeDiagnostics_(incomplete_('invalid-snapshot'));
    Logger.log('activity-sync-incomplete');
    return false;
  }
  writePrivateSnapshot_(JSON.stringify(validation.snapshot));
  return true;
}

function allowedInterval_(minutes) {
  if (minutes === 1 || minutes === 5 || minutes === 10 || minutes === 15 || minutes === 30) return 'minutes';
  if (minutes === 60 || minutes === 120 || minutes === 240 || minutes === 360 || minutes === 480 || minutes === 720) return 'hours';
  if (minutes === 1440) return 'days';
  return '';
}

/**
 * Time-driven entry point. Overlapping runs exit without publishing.
 * An unfinished scan does not replace the previous complete snapshot.
 */
function syncActivitySnapshot() {
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    acquired = lock.tryLock(0);
  } catch (err) {
    writeDiagnostics_(incomplete_('exception'));
    return;
  }
  if (!acquired) {
    writeDiagnostics_(incomplete_('overlap'));
    return;
  }
  try {
    var config = readConfig_();
    if (!config.rootFolderId) {
      writeDiagnostics_(incomplete_('missing-root'));
      return;
    }
    var scan = scanDrive_(config, Date.now());
    if (scan.status !== 'complete') {
      writeDiagnostics_(scan.diagnostics);
      Logger.log('activity-sync-incomplete');
      return;
    }
    var aggregated = aggregateDriveMetadata({
      folders: scan.folders,
      files: scan.files,
      config: config,
      syncedAt: new Date().toISOString()
    });
    if (!aggregated.snapshot) {
      writeDiagnostics_(aggregated.diagnostics);
      Logger.log('activity-sync-incomplete');
      return;
    }
    if (!publishIfValid_(aggregated.snapshot)) return;
    aggregated.diagnostics.filesSeen = scan.files.length;
    aggregated.diagnostics.foldersScanned = scan.folders.length;
    writeDiagnostics_(aggregated.diagnostics);
    Logger.log('activity-sync-complete');
  } catch (err) {
    writeDiagnostics_(incomplete_('exception'));
    Logger.log('activity-sync-incomplete');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Install one clock trigger. Running this again replaces the previous
 * syncActivitySnapshot trigger instead of adding a second one.
 * Allowed intervals: 1, 5, 10, 15, 30, 60, 120, 240, 360, 480, 720, 1440 minutes.
 */
function installActivitySync() {
  var config = readConfig_();
  var kind = allowedInterval_(config.intervalMinutes);
  if (!kind) {
    writeDiagnostics_(incomplete_('invalid-interval'));
    Logger.log('activity-trigger-invalid');
    return;
  }
  var existing = ScriptApp.getProjectTriggers();
  for (var i = existing.length - 1; i >= 0; i--) {
    if (existing[i].getHandlerFunction() === 'syncActivitySnapshot') ScriptApp.deleteTrigger(existing[i]);
  }
  var builder = ScriptApp.newTrigger('syncActivitySnapshot').timeBased();
  if (kind === 'minutes') builder.everyMinutes(config.intervalMinutes);
  else if (kind === 'hours') builder.everyHours(config.intervalMinutes / 60);
  else builder.everyDays(1);
  builder.create();
  Logger.log('activity-trigger-installed');
}
