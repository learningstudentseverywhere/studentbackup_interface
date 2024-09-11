//Importing necessary libraries
const express = require("express");
const xsenv = require('@sap/xsenv');
const axios = require("axios");

//Importing sap-cf-axios to connect to fetchdestapi
const SapCfAxios = require("sap-cf-axios").default;
const baseDestination = SapCfAxios("fetchdestapi");

//using body-parser
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

//Loading env data
xsenv.loadEnv();

//Creating a server using express and storing in app variable
const app = express();
const PORT = process.env.PORT || 5000;

//Callback function
const handleFetchStudentData = async (req, res) => {
    //Get the batch2cap destination details using fetchdestapi
    let responseCAPDestination = ""
    try {
        responseCAPDestination = await baseDestination({
            method: "GET",
            url: "/readDestinationDetails?destination=batch2dest",
            params: {
                $format: "json"
            },
            headers: {
                accept: "application/json"
            }
        });
    }
    catch (error) {
        console.log(error)
    }

    console.log(responseCAPDestination)

    //Storing the values in the variables
    var capURL = responseCAPDestination.data.URL;
    var capTokenURL = responseCAPDestination.data.tokenServiceURL;
    const capAuth = Buffer.from(`${responseCAPDestination.data.clientId}:${responseCAPDestination.data.clientSecret}`).toString("base64");


    //Getting the Access Token using the Access Token url from the above destination
    let tokenCAP = "" 
    try {
        responseCodeCAP = await axios({
            method: "POST",
            url: capTokenURL,
            headers: {
                'Authorization': "Basic " + capAuth, //To get the access token , we are combining client id and client secret and encoding as basee64
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: {
                grant_type: "client_credentials"
            }
        });
        tokenCAP = "Bearer " + responseCodeCAP.data.access_token;
    }
    catch (error) {
        console.log(error)
    }

    //Get the students data
    try{
        const StudentsData = await axios({
            method: "GET",
            url: capURL+ "/odata/v4/school/Students",
            headers: {
              Authorization: tokenCAP,//"Bearer YWVzQG9MRFVPamY1d3ByeGJYaG1zSkN5MG9jOHBmQ0JxYTJUK2JycDB2a01ZaEprdzlBZlhsMkFRMVIzYytXc2VHVTBjWVBUeWMzaG1FMUt3L2IwY2pyMnAwbEkvdjEvQTN5M21Fd1MyMGpXZU5zU2ZNNEVFUHJ3TzFnYzd1L0Vibjc1bHFmcmlWQkpzOGV5eFViYjl3aEl2UT09",
              accept: "application/json"
            }
          });
        let  resultFromCAP = StudentsData.data.value
        
        }
        catch(error){
          console.log(error);
        }

}

//Creating a Route
app.get("/FetchStudentData", jsonParser, handleFetchStudentData);

//Start the server 
app.listen(PORT, () => {
    console.log("port listining");
})



