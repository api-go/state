import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  // 1. 获取最新 tag
  let tag;
  try {
    tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
  } catch (err) {
    throw new Error('Failed to find git tags. Please make sure the repository has tags (e.g., v1.0.0) before publishing.');
  }
  // 去掉 v 前缀
  const version = tag.startsWith('v') ? tag.slice(1) : tag;

  console.log(`Latest git tag: ${tag}, Version to publish: ${version}`);

  // 2. 读取并更新 package.json
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  // 保持原有名称（如果已经带有 @apigo.cc/ 前缀）或替换前缀
  if (!pkg.name.startsWith('@apigo.cc/')) {
    const baseName = pkg.name.includes('/') ? pkg.name.split('/')[1] : pkg.name;
    pkg.name = `@apigo.cc/${baseName}`;
  }
  pkg.version = version;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json: name=${pkg.name}, version=${pkg.version}`);

  // 3. 构建
  console.log('Running build...');
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // 4. 发布
  console.log('Publishing to npm...');
  const args = process.argv.slice(2).join(' ');
  execSync(`npm publish --access public ${args}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('Publish successful!');
} catch (error) {
  console.error('Publish failed:', error.message);
  process.exit(1);
}
