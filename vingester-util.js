/*
**  Vingester ~ Ingest Web Contents as Video Streams
**  Copyright (c) 2021 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

/*  helper class for weighted average calculations  */
class WeightedAverage {
    constructor (len, every) {
        this.len   = len
        this.every = every
        this.val   = []
        this.cnt   = 0
        this.max   = Number.NEGATIVE_INFINITY
        this.min   = Number.POSITIVE_INFINITY
        for (let i = 0; i < len; i++)
            this.val[i] = 0
    }
    record (val, callback) {
        this.val.pop()
        this.val.unshift(val)
        let avg = 0
        let div = 0
        let max = Number.NEGATIVE_INFINITY
        let min = Number.POSITIVE_INFINITY
        for (let i = 0; i < this.len; i++) {
            if (max < this.val[i]) max = this.val[i]
            if (min > this.val[i]) min = this.val[i]
            const k = this.len - i
            avg += this.val[i] * k
            div += k
        }
        avg /= div
        if (this.max < max) this.max = max
        if (this.min > max) this.min = max
        if (this.cnt++ > this.every) {
            this.cnt = 0
            callback({
                avg, min, max,
                tmin: this.min, tmax: this.max
            })
        }
    }
}

module.exports = {
    WeightedAverage
}

