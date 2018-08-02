import Promise from 'bluebird'
import _ from 'lodash'
import { env } from './config'
const nano = require('nano')(`https://${env.db.user}:${env.db.pass}@${env.db.url}`)
const remoteDB = nano.db.use('producto_4')
// create Promise-compatible versions of all functions
Promise.promisifyAll(remoteDB)

export class LookForDiffs {
  constructor () {
    this.csvProds = []
    this.couchProds = []
  }

  binarySearch (arr, property, search) {
    let low = 0
    let high = arr.length
    let mid
    while (low < high) {
      mid = (low + high) >>> 1 // faster version of Math.floor((low + high) / 2)
      arr[mid][property] < search ? low = mid + 1 : high = mid
    }
    return low
  }

  checkAndResolve (csvProds, couchProds) {
    return new Promise((resolve, reject) => {
      let prodstoUpdate = []
      _.each(couchProds, couchProd => {
        let iCsvProd = this.binarySearch(csvProds, 'codigo', couchProd._id)
        if (_.has(csvProds[iCsvProd], 'codigo') && csvProds[iCsvProd].codigo === couchProd._id) {
          if (couchProd.existencias !== parseInt(csvProds[iCsvProd].cantInventario, 10)) {
            couchProd.origen = 'sap'
            couchProd.updated_at = Date.now()
            couchProd.existencias = parseInt(csvProds[iCsvProd].cantInventario, 10)

            prodstoUpdate.push(couchProd)
          }
        } else {
          if (couchProd._id.split('/')[0] !== '_design') {
            couchProd._deleted = true
            prodstoUpdate.push(couchProd)
          }
        }
      })

      remoteDB.bulkAsync({ docs: prodstoUpdate }).then(res => {
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  }
}
