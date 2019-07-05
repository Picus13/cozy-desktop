/* eslint-env mocha */

const should = require('should')

const {
  detectOfflineUnlinkEvents
} = require('../../../../core/local/chokidar/initial_scan')

const Builders = require('../../../support/builders')
const configHelpers = require('../../../support/helpers/config')
const pouchHelpers = require('../../../support/helpers/pouch')

const { platform } = process

describe('core/local/chokidar/initial_scan', () => {
  let builders

  before('instanciate config', configHelpers.createConfig)
  before('instanciate pouch', pouchHelpers.createDatabase)

  beforeEach('set up builders', function() {
    builders = new Builders({ pouch: this.pouch })
  })

  after('clean pouch', pouchHelpers.cleanDatabase)
  after('clean config directory', configHelpers.cleanConfig)

  describe('.detectOfflineUnlinkEvents()', function() {
    beforeEach('reset pouchdb', function(done) {
      this.pouch.resetDatabase(done)
    })

    it('detects deleted files and folders', async function() {
      const folder1 = await builders
        .metadir()
        .path('folder1')
        .create()
      const folder2 = await builders
        .metadir()
        .path('folder2')
        .create()
      await builders
        .metadir()
        .path('.cozy_trash/folder3')
        .trashed()
        .create()
      const file1 = await builders
        .metafile()
        .path('file1')
        .create()
      const file2 = await builders
        .metafile()
        .path('file2')
        .create()
      await builders
        .metafile()
        .path('.cozy_trash/file3')
        .trashed()
        .create()
      const initialScan = { ids: [folder1._id, file1._id] }

      const { offlineEvents } = await detectOfflineUnlinkEvents(
        initialScan,
        this.pouch
      )

      should(offlineEvents).deepEqual([
        { type: 'unlinkDir', path: folder2.path, old: folder2 },
        { type: 'unlink', path: file2.path, old: file2 }
      ])
    })

    if (platform === 'win32') {
      it('ignores incompatible docs', async function() {
        await builders
          .metafile()
          .incompatible()
          .create()
        const initialScan = { ids: [] }

        const { offlineEvents } = await detectOfflineUnlinkEvents(
          initialScan,
          this.pouch
        )
        should(offlineEvents).deepEqual([])
      })
    }
  })
})
