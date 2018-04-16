import Promise from 'bluebird'
import _ from 'lodash'
import Papa from 'papaparse'
import { originWins } from './modules/deconflict'
import { env } from './modules/config'
import { LookForDiffs } from './modules/lookForDiffs'

const fs = require('fs')
const nano = require('nano')(`https://${env.db.user}:${env.db.pass}@${env.db.url}`)
const remoteDB = nano.db.use('producto_2')

let lookForDiffs = new LookForDiffs()

// create Promise-compatible versions of all functions
Promise.promisifyAll(remoteDB)

setInterval(() => {
  let fileStream = fs.createReadStream(env.prods_sap_file) // path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt')
  Papa.parse(fileStream, {
    header: true,
    complete: csvParsed => {
      remoteDB.listAsync({ include_docs: true }).then(res => {
        lookForDiffs.checkAndResolve(_.filter(csvParsed.data, ['_delete', 'false']), _.map(res.rows, 'doc')).then(res => {
          console.log('prods actualizados', res)
        }).catch(err => {
          console.error('Puto error no previsto', err)
        })
      }).catch(err => {
        console.error('Error al listar los documentos', err)
      })
      fileStream.destroy()
    },
    error: err => {
      console.error('Puto error', err)
      fileStream.destroy()
    }
  })
}, 600000)

// console.log(path.resolve(os.tmpdir(), 'fz3temp-3', 'product.txt'))
setInterval(() => {
  remoteDB.viewAsync('conflicts', 'all-conflicts-view', {
    limit: 30
  }).then(docs => {
    docs.rows.forEach(doc => {
      originWins(remoteDB, doc.id, 'origen', 'sap', (err, data) => {
        if (!err) {
          console.log('merge', data)
        } else {
          console.error('Error al resolver el conflicto del doc ' + doc.id, err)
        }
      })
    })
  }).catch(err => {
    console.error('Error alldocs', err)
  })
}, 20000)
