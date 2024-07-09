import { expect as _expect, use } from 'chai';
const expect = _expect;
import chaiSubset from 'chai-subset';
import chaiAsPromised from 'chai-as-promised';
import { config, getConnection } from './hooks/global-hooks.mjs';
import { mkdirCleanup } from './hooks/mkdir-hooks.mjs';

use(chaiSubset);
use(chaiAsPromised);

describe('06mkdir: mkdir() method tests', function () {
  let sftp;

  before('mkdir() setup hook', async function () {
    try {
      sftp = await getConnection();
      await sftp.put(Buffer.from('Bad dir file'), `${config.sftpUrl}/bad-dir-file`);
      await sftp.mkdir(`${config.sftpUrl}/bad-perm-dir`);
      await sftp.chmod(`${config.sftpUrl}/bad-perm-dir`, 0o111);
      return true;
    } catch (err) {
      console.error(`mkdir setup error: ${err.message}`);
      throw err;
    }
  });

  after('mkdir() test cleanup', async function () {
    await mkdirCleanup(sftp, config.sftpUrl);
    await sftp.end();
    return true;
  });

  it('mkdir should return a promise', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/mkdir-promise`)).to.be.a('promise');
  });

  it('mkdir without recursive option and bad path should be rejected', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/mocha3/mm`)).to.be.rejectedWith(
      /Bad path/,
    );
  });

  it('mkdir without recursive option and file in path shold be rejected', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/bad-dir-file/foo`)).to.be.rejectedWith(
      /Bad path/,
    );
  });

  it('mkdir with recursion and file in path should be rejected', function () {
    return expect(
      sftp.mkdir(`${config.sftpUrl}/bad-dir-file/foo`, true),
    ).to.be.rejectedWith(/Bad path/);
  });

  it('mkdir without permission on parent throws error', function () {
    return expect(sftp.mkdir(`${config.sftpUrl}/bad-perm-dir/foo`)).to.be.rejectedWith(
      /Permission denied/,
    );
  });

  it('mkdir with recursive option should create all directories', function () {
    return sftp
      .mkdir(`${config.sftpUrl}/mkdir-recursive/dir-force/subdir`, true)
      .then(() => {
        return sftp.list(`${config.sftpUrl}/mkdir-recursive/dir-force`);
      })
      .then((list) => {
        return expect(list).to.containSubset([{ name: 'subdir' }]);
      });
  });

  it('mkdir without recursive option creates dir', function () {
    return sftp
      .mkdir(config.sftpUrl + '/mkdir-non-recursive', false)
      .then(() => {
        return sftp.list(config.sftpUrl);
      })
      .then((list) => {
        return expect(list).to.containSubset([{ name: 'mkdir-non-recursive' }]);
      });
  });

  it('Relative directory name creates dir', function () {
    let path = './testServer/mkdir-xyz';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz directory created`,
    );
  });

  it('Relative directory with sub dir creation', function () {
    let path = './testServer/mkdir-xyz/abc';
    return expect(sftp.mkdir(path)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-xyz/abc directory created`,
    );
  });

  it('Relative dir name created with recursive flag', function () {
    let path = './testServer/mkdir-abc';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-abc directory created`,
    );
  });

  it('relative dir and sub dir created with recursive flag', function () {
    let path = './testServer/mkdir-def/ghi';
    return expect(sftp.mkdir(path, true)).to.eventually.equal(
      `${config.sftpUrl}/mkdir-def/ghi directory created`,
    );
  });

  // permissions don't really work on win32
  it('non-recursive mkdir without permission is rejeted', function () {
    return sftp.remotePlatform !== 'windows'
      ? expect(sftp.mkdir('/foo', false)).to.be.rejectedWith(
          /(Bad path)|(Permission denied)/,
        )
      : expect(true).to.equal(true);
  });

  it('recursive mkdir without permission is rejeted', function () {
    return sftp.remotePlatform !== 'win32'
      ? expect(sftp.mkdir('/foo', true)).to.be.rejectedWith(
          /(Bad path)|(Permission denied)/,
        )
      : expect(true).to.equal(true);
  });
});
