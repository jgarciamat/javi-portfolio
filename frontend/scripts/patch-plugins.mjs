// AGP 9 refuses `proguard-android.txt` (it disables R8 optimisations); some Capacitor plugins still use it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const files = ['node_modules/@capacitor-community/in-app-review/android/build.gradle'];
for (const file of files) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  const patched = source.replace("'proguard-android.txt'", "'proguard-android-optimize.txt'");
  if (patched !== source) writeFileSync(file, patched);
}
