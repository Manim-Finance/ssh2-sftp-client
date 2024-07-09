import { expect as _expect, use } from 'chai';
const expect = _expect;
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import { createWriteStream, statSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import {
  config,
  getConnection,
  makeLocalPath,
  lastRemoteDir,
} from './hooks/global-hooks.mjs';
import { getSetup, getCleanup } from './hooks/get-hooks.mjs';

use(chaiSubset);
use(chaiAsPromised);

describe('12get: get() method tests', function () {
  let sftp;

  before('get() setup hook', async function () {
    sftp = await getConnection();
    await getSetup(sftp, config.sftpUrl, config.localUrl);
    return true;
  });

  after('get() cleanup hook', async function () {
    await getCleanup(sftp, config.sftpUrl, config.localUrl);
    await sftp.end();
    return true;
  });

  it('get returns a promise', function () {
    return expect(sftp.get(config.sftpUrl + '/get-promise.txt')).to.be.a('promise');
  });

  it('get the file content', async function () {
    const data = await sftp.get(`${config.sftpUrl}/get-promise.txt`);
    expect(Buffer.isBuffer(data)).to.equal(true);
    return expect(data.toString()).to.equal('Get promise test');
  });

  it('get large text file using a stream', async function () {
    const localPath = makeLocalPath(config.localUrl, 'get-large.txt');
    const remotePath = config.sftpUrl + '/get-large.txt';
    const out = createWriteStream(localPath, {
      flags: 'w',
      encoding: null,
    });
    await sftp.get(remotePath, out);
    const stats = await sftp.stat(remotePath);
    const localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get gzipped file using a stream', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-gzip.txt.gz');
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    let out = createWriteStream(localPath, {
      flags: 'w',
      encoding: null,
    });
    await sftp.get(remotePath, out);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get gzipped file and gunzip in pipe', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-unzip.txt');
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    let gunzip = createGunzip();
    let out = createWriteStream(localPath, {
      flags: 'w',
      encoding: null,
    });
    gunzip.pipe(out);
    await sftp.get(remotePath, gunzip);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(stats.size < localStats.size).to.equal(true);
  });

  it('get non-existent file is rejected', function () {
    return expect(sftp.get(config.sftpUrl + '/file-not-exist.md')).to.be.rejectedWith(
      'No such file',
    );
  });

  it('get non-existent file does not closes stream', async function () {
    const localPath = makeLocalPath(config.localUrl, 'get-a-file.txt');
    const out = createWriteStream(localPath, {
      flags: 'w',
      encoding: null,
    });
    try {
      await sftp.get(`${config.sftpUrl}/file-not-exist.md`, out);
    } catch (err) {
      let errRE = /get: No such file/;
      expect(errRE.test(err.message)).to.be.true;
      return expect(out.destroyed).to.be.false;
    }
  });

  it('get with relative remote path 1', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-relative1-gzip.txt.gz');
    let remotePath = './testServer/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative remote path 2', async function () {
    let localPath = makeLocalPath(config.localUrl, 'get-relative2-gzip.txt.gz');
    let remotePath =
      '../' + lastRemoteDir(config.remoteRoot) + '/testServer/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative local path 3', async function () {
    let localPath = './test/testData/get-relative3-gzip.txt.gz';
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with relative local path 4', async function () {
    let localPath = '../ssh2-sftp-client/test/testData/get-relative4-gzip.txt.gz';
    let remotePath = config.sftpUrl + '/get-gzip.txt.gz';
    await sftp.get(remotePath, localPath);
    let stats = await sftp.stat(remotePath);
    let localStats = statSync(localPath);
    return expect(localStats.size).to.equal(stats.size);
  });

  it('get with no permission on destination dir', function () {
    let localPath = makeLocalPath(config.localUrl, 'no-perm-dir', 'foo.txt');
    let remotePath = `${config.sftpUrl}/get-gzip.txt.gz`;
    return expect(sftp.get(remotePath, localPath)).to.be.rejectedWith(/Bad path/);
  });
});
