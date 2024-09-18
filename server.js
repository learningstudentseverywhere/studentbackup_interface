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

    //Acknowledgement
    res.status(202).send();

    //Getting the Job id, schedule id
    var sap_job_id = req.headers['x-sap-job-id'];
    var sap_job_schedule_id = req.headers['x-sap-job-schedule-id'];
    var sap_job_run_id = req.headers['x-sap-job-run-id'];

    
    
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

    //Fetching job destination details using base destination
    let responseJobDestination = []
    try {
        responseJobDestination = await baseDestination({
            method: "GET",
            url: "/readDestinationDetails?destination=jobschedulerDestination",
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

    //Storing the data fetched from destination
    var jobSchedulerURL = responseJobDestination.data.URL;
    var jobSchedulerUser = responseJobDestination.data.User;
    let jobSchedulerPassword = responseJobDestination.data.Password;
   

    let studentsDataFromCAP = []
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
        studentsDataFromCAP = StudentsData.data.value
        
        }
        catch(error){
          console.log(error);
        }
    
    
    //Post the student data to the backup table
    let originalData = studentsDataFromCAP.length;
    let count=0;
    for(let data of studentsDataFromCAP){
          try{
             let studentBackupUpload = await axios({
                method:"POST",
                url: capURL + "/odata/v4/school/studentsBackup",
                headers:{
                    'Content-Type':'application/json',
                    'Authorization':tokenCAP
                },
                data:data
             })
             count = count + 1;
          }
          catch(error){
            console.log(error);
          }
    }


    //Updating to job scheduler status
    let AuthValue = btoa(jobSchedulerUser + ":" + jobSchedulerPassword)
    if(count>0){
        try{
            await axios({
                method: "PUT",
                url: jobSchedulerURL + `/scheduler/jobs/${sap_job_id}/schedules/${sap_job_schedule_id}/runs/${sap_job_run_id}`,
                headers: {
                    'Accept': 'application/json',
                    "Authorization": "Basic " + AuthValue
                },
                data: {
                    "success": true,
                    "message": "Successfully copied data"
                }
            });
        }
        catch(error){
            console.log(error);
        }
    }

    else{
        try{
            await axios({
                method: "PUT",
                url: jobSchedulerURL + `/scheduler/jobs/${sap_job_id}/schedules/${sap_job_schedule_id}/runs/${sap_job_run_id}`,
                headers: {
                    'Accept': 'application/json',
                    "Authorization": "Basic " + AuthValue
                },
                data: {
                    "success": false,
                    "message": "Error while sending"
                }
            });
        }
        catch(error){
            console.log(error);
        }
    }
  
    console.log(`Out of ${originalData} Records, ${count} Records created`);
}

//Creating a Route
app.get("/FetchStudentData", jsonParser, handleFetchStudentData);

//Start the server 
app.listen(PORT, () => {
    console.log("port listining");
})



