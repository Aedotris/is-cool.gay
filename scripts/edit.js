const array = process.env.EVENT_ISSUE_BODY.split("### ");
const nonascii = /[^\u0000-\u007F]+/;

// Split each item by double newlines
array.forEach((item, index) => {
  array[index] = item.split("\n\n");
});

// Handle additional newlines in the third section
const original = array[3][1];
array[3][1] = original.split("\n")[0];
array[3].push(original.split("\n")[1]);

// Check input format
if (
  !(
    array.length === 4 &&
    array[0].length === 1 &&
    array[0][0] === "" &&
    array[1][0] === "Subdomain Name" &&
    array[1].length === 3 &&
    array[2][0] === "DNS Record" &&
    array[2].length === 3 &&
    array[3].length === 3 &&
    array[3][0] === "Agreement" &&
    array[3][1] === "- [X] I have ensured that this subdomain is mine" &&
    array[3][2] === undefined &&
    !array[1][1].includes(" ") &&
    !array[2][1].includes(" ") &&
    !nonascii.test(array[1][1]) &&
    !nonascii.test(array[2][1]) &&
    array[1][1] !== ".is-cool.gay" &&
    array[1][1].endsWith(".is-cool.gay")
  )
) {
  console.log(
    "not planned|Format invalid! It's usually because you didn't check the agreements, or the domain/record you entered is invalid!|" +
    array[1][1]
  );
  return;
}

const flare = require("cloudflare");
const cf = new flare({
  apiToken: process.env.CF_TOKEN,
});

const ipv4 =
  /^\s*((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))\s*$/gm;
const ipv6 =
  /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/gm;
const hostname =
  /^\s*((?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?)\s*$/gm;

cf.dns.records
  .list({
    zone_id: "66b0d2af52cc381a6a0b04fcd4b9c83d",
    name: array[1][1],
    comment: { exact: process.env.EVENT_USER_LOGIN },
    per_page: 5000000,
  })
  .then((records) => {
    const availabilityFilter = records.result.filter((record) => {
      return (
        record.name === array[1][1] &&
        record.comment === process.env.EVENT_USER_LOGIN
      );
    });

    if (availabilityFilter.length > 0) {
      let type = "invalid";
      if (hostname.test(array[2][1])) type = "CNAME";
      if (ipv4.test(array[2][1])) type = "A";
      if (ipv6.test(array[2][1])) type = "AAAA";
      if (type === "invalid") {
        console.log(
          "not planned|The record destination you entered is invalid!|" +
          array[2][1]
        );
        return;
      }

      cf.dns.records
        .edit(
          availabilityFilter[0].id,
          {
            zone_id: "66b0d2af52cc381a6a0b04fcd4b9c83d",
            content: array[2][1],
            name: array[1][1],
            proxied: false,
            type,
            ttl: 60,
            comment: process.env.EVENT_USER_LOGIN,
          }
        )
        .then((response) => {
          if (!response.success) {
            const errorMessage = response.errors && response.errors.length > 0
              ? response.errors[0].message
              : "Unknown error";
            console.log(
              `not planned|CloudFlare Error:${errorMessage}|${array[1][1]}`
            );
            return;
          }
          console.log(
            "completed|Your subdomain has been successfully edited!|" +
            array[1][1]
          );
        });
    } else {
      console.log(
        "not planned|This subdomain is not yours or the subdomain is not found!|" +
        array[1][1]
      );
    }
  })
  .catch((error) => {
    console.log(`not planned|Unexpected error occurred: ${error.message}`);
  });
