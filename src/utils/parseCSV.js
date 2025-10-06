const fs = require("fs");
const csv = require("csv-parser");

const parseCSV = (filePath, mapFn = (row) => row) => {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        try {
          const mapped = mapFn(data);
          if (mapped) results.push(mapped);
        } catch (err) {
          reject(err);
        }
      })
      .on("end", () => {
        fs.unlinkSync(filePath);
        resolve(results);
      })
      .on("error", (err) => {
        fs.unlinkSync(filePath);
        reject(err);
      });
  });
};

module.exports = parseCSV;
