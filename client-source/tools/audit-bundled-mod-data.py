"""Check signed mod data, complete setup, and small update separation."""
from pathlib import Path
import hashlib,importlib.util,json,sys,zipfile
root=Path(__file__).resolve().parents[1];version=sys.argv[1];release=root/'build/releases'/version
def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
spec=importlib.util.spec_from_file_location('signed',root/'tools/audit-installation-release.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
payload=module.verify_signed_envelope(json.loads((release/'latest.json').read_text(encoding='utf-8')))
assert payload==json.loads((release/'payload.json').read_text(encoding='utf-8'))
data=payload['modData'];assert data['file']=='TH3data.mor' and data['sha256']==payload['dataSha256']
archive=release/Path(data['archiveUrl']).name
assert archive.stat().st_size==data['archiveSize'] and sha(archive)==data['archiveSha256']
with zipfile.ZipFile(archive) as z:
    assert z.namelist()==['TH3data.mor'] and z.getinfo('TH3data.mor').file_size==data['size']
    with z.open('TH3data.mor') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==data['sha256']
with zipfile.ZipFile(release/'initial.zip') as z:
    expected={f['path'] for f in payload['files']}|{'release.json','TH3data.mor'}
    assert set(z.namelist())==expected and len(z.namelist())==len(expected)
    with z.open('TH3data.mor') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==data['sha256']
    assert json.loads(z.read('release.json'))==json.loads((release/'latest.json').read_text(encoding='utf-8'))
with zipfile.ZipFile(release/f'ReturnsFromDarkness-Client-{version}.zip') as z:
    assert set(z.namelist())=={f['path'] for f in payload['files']}
    assert not any(Path(n).name.lower() in {'diabdat.mpq','th3data.mor'} for n in z.namelist())
assert data['includedInSetup'] and data['size']==886065900
report=dict(passed=True,version=version,signatureVerified=True,modDataByteExact=True,
    dataSha256=data['sha256'],modDataBytes=data['size'],completeSetupIncludesModData=True,
    originalDiabdatIncluded=False,smallUpdateExcludesModData=True,setupBytes=(release/'ReturnsFromDarkness-Setup.exe').stat().st_size,
    modArchiveBytes=data['archiveSize'],clientUpdateBytes=payload['archiveSize'])
(root/f'analysis/bundled-mod-data-{version}-qa.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
