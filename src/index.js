import Promise from "bluebird";
import { merge } from "./modules/deconflict";
import { env } from "./modules/config";

const nano = require('nano')(`https://${env.db.user}:${env.db.pass}@${env.db.url}`)
const remoteDB = nano.db.use('productos_prod');

// create Promise-compatible versions of all functions
Promise.promisifyAll(remoteDB);


setInterval(() => {
  remoteDB.viewAsync('conflicts', 'all-conflicts-view', {
    limit: 30
  }).then( docs => {

    docs.rows.forEach(doc => {

      merge(remoteDB, doc.id, (err, data) => {
        if (!err) {
          console.log("merge", data);
        }else{
          console.error("Error al resolver el conflicto del doc "+doc.id, err);
        }
      });

    });

  }).catch( err => {
    console.error("Error alldocs", err);
  })

}, 10000);
