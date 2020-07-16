
const process = require('process');

const {InfluxDB} = require('@influxdata/influxdb-client')

// You can generate a Token from the "Tokens Tab" in the UI

let nowNano = new Date().getTime() * 1000000;
let intervalNano = 600 * 1000 * 1000000; //10 min in nanosecs

class InfluxDBClient{

    constructor(url, org, bucket, token){
// You can generate a Token from the "Tokens Tab" in the UI
        this.org = org;
        this.bucket = bucket;
        this.token = token;
        this.url = url;

        this.client = new InfluxDB({url: this.url, token: this.token});
    }

    async writeData (lines = ['testmeas value=300 ' + (nowNano - (3 * intervalNano)),
                                 'testmeas value=200 ' + (nowNano - (2 * intervalNano)),
                                 'testmeas value=100 ' + (nowNano - intervalNano)]){

//        console.log("DEBUG lines: \n" + lines);

        const writeAPI = this.client.getWriteApi(this.org, this.bucket, 'ns');
        await writeAPI.useDefaultTags({host: 'host1'})
        await writeAPI.writeRecords(lines);

        await writeAPI.close().catch(e => {
            console.error(`ERROR: closing write connection: ${e}`);
            throw e;
        })
    };

    async queryData(query = `from(bucket: "${this.bucket}") |> range(start: -1h)`){
        const queryApi = this.client.getQueryApi(this.org)

        console.log("DEBUG querying: " + query);

        let result = [];

        return await new Promise((resolve,reject) => {
            queryApi.queryRows(query, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    result.push(o);
                },
                error(error) {
                    reject(error)
                },
                complete() {
                    resolve(result);
                },
            });
        }).catch(async error => {
            console.error('Caught Error on Query: ' + error);
            throw error;
        });
    }
}

module.exports = InfluxDBClient;

/* --- Write Data --- */

/*
const {Point} = require('@influxdata/influxdb-client')
const writeApi = client.getWriteApi(org, bucket)


const point = new Point('mem')
    .floatField('used_percent', 23.43234543)
writeApi.writePoint(point)
writeApi
    .close()
    .then(() => {
        console.log('FINISHED')
    })
    .catch(e => {
        console.error(e)
        console.log('\nFinished ERROR')
    })
*/


/* --- Execute a Flux Query --- */

/*
const queryApi = client.getQueryApi(org)

const query = `from(bucket: "${bucket}") |> range(start: -1h)`
queryApi.queryRows(query, {
    next(row, tableMeta) {
        const o = tableMeta.toObject(row)
        console.log(
            `${o._time} ${o._measurement} in '${o.location}' (${o.example}): ${o._field}=${o._value}`
        )
    },
    error(error) {
        console.error(error)
        console.log('\nFinished ERROR')
    },
    complete() {
        console.log('\nFinished SUCCESS')
    },
})
*/
