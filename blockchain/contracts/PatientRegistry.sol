//SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

contract PatientsRegistry {

    //Structs
    struct MedicalRecord {
        uint256 timestamp;
        string recordType;
        string description;
        string doctorName;
        string institution;
        address addedBy;
    }

    struct Patient{
        bool registered;
        uint256 dateOfBirth;
        string name;
        string bloodType;
        string gender;
        MedicalRecord[] records;
    }

    struct Institution{
        bool registered;
        string name;
        string institutionType;
        string Location;
        string registrationId;
    }

    struct AccessLog {
        address institution;
        string institutionName;
        uint256 timestamp;
        string action;
    }

    //mappings
    mapping (address => Patient) private patients;
    mapping(address => Institution) private institutions;
    mapping(address => AccessLog[]) private logs;

    event PatientRegistered(address indexed patient, string name, uint256 timestamp);
    event RecordAdded(address indexed patient, string recordType, address addedBy, uint256 timestamp);
    event InstitutionRegistered(address indexed institution, string name, uint256 timestamp);
    event PatientDataAccessed(address indexed patient, address indexed institution, string action, uint256 timestamp);


    modifier registered(){
        require(patients[msg.sender].registered, "Not registered");
        _;
    }
    modifier notRegistered(){
        require(!patients[msg.sender].registered, "Already registered");
        _;
    }
    modifier onlyInstitution(){
        require(institutions[msg.sender].registered, "Institution not registered");
        _;
    }
    modifier notInstitution(){
        require(!institutions[msg.sender].registered, "Institution not registered");
        _;
    }

    
    //patient registeration
    function register(
    string calldata _name, 
    uint256 _dateOfBirth, 
    string calldata _bloodType, 
    string calldata _gender) external notRegistered{
        require (bytes(_name).length > 0, "Name is required");
        require(_dateOfBirth > 0, "Date of birth is required");
        require(bytes(_gender).length>0,"Gender is required");

        Patient storage p = patients[msg.sender];
        p.registered = true;
        p.name = _name;
        p.dateOfBirth = _dateOfBirth;
        p.bloodType = _bloodType;
        p.gender = _gender;

        emit PatientRegistered(msg.sender,_name, block.timestamp);
    }

    //patient adds medical record
    function addMedicalRecord(
        string calldata _recordType,
        string calldata _description,
        string calldata _doctorName,
        string calldata _institution
    ) external registered{
        require(bytes(_recordType).length > 0, "Record type required");
        require(bytes(_description).length > 0, "Description is required");
        require(bytes(_doctorName).length > 0, "Doctor name is required");
        require(bytes(_institution).length > 0, "Institution name is required");

        patients[msg.sender].records.push(MedicalRecord({
            timestamp: block.timestamp,
            recordType: _recordType,
            description: _description,
            doctorName: _doctorName,
            institution: _institution,
            addedBy: address(0)
        }));

        emit RecordAdded(msg.sender, _recordType, address(0), block.timestamp);
    }

    //retreiving data for patient
    function getMyProfile() external view registered returns(string memory name, uint256 dateOfBirth, string memory bloodType, string memory gender, uint256 recordCount){
        Patient storage p = patients[msg.sender];
        return (p.name, p.dateOfBirth, p.bloodType, p.gender, p.records.length);
    }

    function getMedicalRecord(uint256 index) external view registered returns(
        uint256 timestamp,
        string memory recordType,
        string memory description,
        string memory doctorName,
        string memory institution,
        address addedBy
    ){
        Patient storage p = patients[msg.sender];
        require(index < p.records.length, "Index out of bounds");
        MedicalRecord storage r = p.records[index];
        return (r.timestamp, r.recordType, r.description, r.doctorName, r.institution, r.addedBy);
    }

    function getRecordCount() external view registered returns(uint256){
        return patients[msg.sender].records.length;
    }

    function isRegistered() external view returns(bool){
        return patients[msg.sender].registered;
    }

    function registerInstitution(
        string calldata _name,
        string calldata _institutionType,
        string calldata _location,
        string calldata _registrationId
    ) external notInstitution{
        require(bytes(_name).length > 0, "Institution name required");
        require(bytes(_registrationId).length > 0, "Registration ID required");
        Institution storage insti = institutions[msg.sender];
        insti.registered = true;
        insti.name = _name;
        insti.institutionType = _institutionType;
        insti.Location = _location;
        insti.registrationId = _registrationId;

        emit InstitutionRegistered(msg.sender, _name, block.timestamp);
    }

    function isInstitutionRegistered() external view returns(bool){
        return institutions[msg.sender].registered;
    }

    function getInstitutionName() external view returns(string memory){
        return institutions[msg.sender].name;
    }

    //institutions read patient data
    function getPatientBasicInfo(address _patient) external onlyInstitution returns(
        string memory name,
        uint256 _dateOfBirth,
        string memory bloodType,
        string memory gender,
        uint256 recordCount
    ){
        require(patients[_patient].registered, "Patient not found");

        logs[_patient].push(AccessLog({
            institution: msg.sender,
            institutionName: institutions[msg.sender].name,
            timestamp: block.timestamp,
            action: "READ"
        }));
        emit PatientDataAccessed(_patient, msg.sender, "READ", block.timestamp);

        Patient storage p = patients[_patient];
        return(p.name, p.dateOfBirth, p.bloodType, p.gender, p.records.length);
    }

    function getPatientRecord(address _patient, uint256 index) external view onlyInstitution returns(
        uint256 timestamp,
        string memory recordType,
        string memory description,
        string memory doctorName,
        string memory institution,
        address addedBy
    ){
        require(patients[_patient].registered, "Patient not found");
        Patient storage p = patients[_patient];
        require(index < p.records.length, "Index out of bounds");
        MedicalRecord storage r = p.records[index];
        return (r.timestamp, r.recordType, r.description, r.doctorName, r.institution, r.addedBy);
    }

    //institution adds data
    function addRecordForPatient(
        address _patient,
        string calldata _recordType,
        string calldata _description,
        string calldata _doctorName
    ) external onlyInstitution{
        require(patients[_patient].registered, "Patient not registered");
        require(bytes(_recordType).length > 0, "Record type required");
        require(bytes(_description).length > 0, "Description required");

        patients[_patient].records.push(MedicalRecord({
            timestamp: block.timestamp,
            recordType: _recordType,
            description: _description,
            doctorName: _doctorName,
            institution: institutions[msg.sender].name,
            addedBy: msg.sender
        }));

        logs[_patient].push(AccessLog({
            institution: msg.sender,
            institutionName: institutions[msg.sender].name,
            timestamp: block.timestamp,
            action: "WRITE"
        }));
        emit RecordAdded(_patient, _recordType, msg.sender, block.timestamp);
        emit PatientDataAccessed(_patient, msg.sender, "WRITE", block.timestamp);
    }

    //patient view access logs
    function getAccessLogCount() external view registered returns(uint256){
        return logs[msg.sender].length;
    }
    function getAccessLog(uint256 index) external view registered returns(
        address institution,
        string memory institutionName,
        uint256 timestamp,
        string memory action
    ){
        AccessLog[] storage al = logs[msg.sender];
        require(index < al.length, "Index out of bound");
        AccessLog storage log = al[index];
        return(log.institution, log.institutionName, log.timestamp, log.action);
    }

}