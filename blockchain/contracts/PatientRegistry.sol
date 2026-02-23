//SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

contract PatientsRegistry {
    struct MedicalRecord {
        uint256 timestamp;
        string recordType;
        string description;
        string doctorName;
        string institution;
    }

    struct Patient{
        bool registered;
        uint256 dateOfBirth;
        string name;
        string bloodType;
        string gender;
        MedicalRecord[] records;
    }

    mapping (address => Patient) private patients;

    event PatientRegistered(address indexed patient, string name, uint256 timestamp);
    event RecordAdded(address indexed patient, string recordType, uint256 timestamp);

    modifier registered(){
        require(patients[msg.sender].registered, "Not registered");
        _;
    }
    modifier notRegistered(){
        require(!patients[msg.sender].registered, "Already registered");
        _;
    }

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
            institution: _institution
        }));

        emit RecordAdded(msg.sender, _recordType, block.timestamp);
    }

    function getMyProfile() external view registered returns(string memory name, uint256 dateOfBirth, string memory bloodType, string memory gender, uint256 recordCount){
        Patient storage p = patients[msg.sender];
        return (p.name, p.dateOfBirth, p.bloodType, p.gender, p.records.length);
    }

    function getMedicalRecord(uint256 index) external view registered returns(
        uint256 timestamp,
        string memory recordType,
        string memory description,
        string memory doctorName,
        string memory institution
    ){
        Patient storage p = patients[msg.sender];
        require(index < p.records.length, "Index out of bounds");
        MedicalRecord storage r = p.records[index];
        return (r.timestamp, r.recordType, r.description, r.doctorName, r.institution);
    }

    function getRecordCount() external view registered returns(uint256){
        return patients[msg.sender].records.length;
    }

    function isRegistered() external view returns(bool){
        return patients[msg.sender].registered;
    }
}