const d = 20;
const d_inv = 1/d;
const n = (d + 1) * (d + 1)

console.log(d);

const texCoord = [];
const index = [];

// texCoord
for (let y = 0; y <= d; ++y) {
    for (let x = 0; x <= d; ++x) {
        texCoord.push(x*d_inv, y*d_inv);
        //console.log(j*d_inv, i*d_inv);
    }
}
console.log(texCoord);

// index
const rowStride = d + 1;
for (let y = 0; y < d; ++y) {
    const rowOff = y * rowStride;
    for (let x = 0; x < d; ++x) {
        index.push(rowOff + x, rowOff + x + 1, rowOff + x + rowStride + 1);
    }
}
for (let x = 0; x < d; ++x) {
    for (let y = 0; y < d; ++y) {
        const rowOff = y * rowStride;
        index.push(rowOff + x, rowOff + x + rowStride + 1, rowOff + x + rowStride);
    }
}

