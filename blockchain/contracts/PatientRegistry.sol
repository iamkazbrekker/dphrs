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

    struct Researcher {
        bool registered;
        string name;
        string institution;
        string researchField;
        string licenseId;
        uint256 registeredAt;
        uint256 dataAccessCount;
    }

    struct AccessLog {
        address institution;
        string institutionName;
        uint256 timestamp;
        string action;
    }

    // Anonymized record — no patient name, DOB, or wallet address
    struct AnonymizedRecord {
        uint256 timestamp;
        string recordType;
        string description;
        string institution;
        string bloodType;
        string gender;
        uint256 patientIndex; // opaque sequential ID, not a real address
    }

    struct DatasetStats {
        uint256 totalPatients;
        uint256 totalRecords;
        uint256 lastUpdated;
    }

    //mappings
    mapping (address => Patient) private patients;
    mapping(address => Institution) private institutions;
    mapping(address => Researcher) private researchers;
    mapping(address => AccessLog[]) private logs;

    // Internal list of all patient addresses (for researcher enumeration)
    address[] private patientAddresses;
    uint256 private totalRecordsCount;

    event PatientRegistered(address indexed patient, string name, uint256 timestamp);
    event RecordAdded(address indexed patient, string recordType, address addedBy, uint256 timestamp);
    event InstitutionRegistered(address indexed institution, string name, uint256 timestamp);
    event PatientDataAccessed(address indexed patient, address indexed institution, string action, uint256 timestamp);
    event ResearcherRegistered(address indexed researcher, string name, string researchField, uint256 timestamp);
    event DatasetAccessed(address indexed researcher, uint256 recordCount, uint256 timestamp);


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
    modifier onlyResearcher(){
        require(researchers[msg.sender].registered, "Researcher not registered");
        _;
    }
    modifier notResearcher(){
        require(!researchers[msg.sender].registered, "Already registered as researcher");
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

        patientAddresses.push(msg.sender);

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

        totalRecordsCount++;
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

        totalRecordsCount++;

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

    // ─────────────────────────────────────────────
    //  RESEARCHER FUNCTIONS
    // ─────────────────────────────────────────────

    /// @notice Register as a researcher to gain access to anonymized patient datasets
    function registerResearcher(
        string calldata _name,
        string calldata _institution,
        string calldata _researchField,
        string calldata _licenseId
    ) external notResearcher {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_institution).length > 0, "Institution required");
        require(bytes(_licenseId).length > 0, "License ID required");

        Researcher storage r = researchers[msg.sender];
        r.registered = true;
        r.name = _name;
        r.institution = _institution;
        r.researchField = _researchField;
        r.licenseId = _licenseId;
        r.registeredAt = block.timestamp;
        r.dataAccessCount = 0;

        emit ResearcherRegistered(msg.sender, _name, _researchField, block.timestamp);
    }

    function isResearcherRegistered() external view returns (bool) {
        return researchers[msg.sender].registered;
    }

    function getResearcherProfile() external view onlyResearcher returns (
        string memory name,
        string memory institution,
        string memory researchField,
        string memory licenseId,
        uint256 registeredAt,
        uint256 dataAccessCount
    ) {
        Researcher storage r = researchers[msg.sender];
        return (r.name, r.institution, r.researchField, r.licenseId, r.registeredAt, r.dataAccessCount);
    }

    /// @notice Returns global dataset statistics (no PII)
    function getDatasetStats() external view onlyResearcher returns (
        uint256 totalPatients,
        uint256 totalRecords,
        uint256 lastUpdated
    ) {
        return (patientAddresses.length, totalRecordsCount, block.timestamp);
    }

    /// @notice Returns a batch of anonymized records for a range of patients.
    ///         All PII (name, DOB, wallet address) is stripped.
    ///         Only bloodType, gender, recordType, description, institution, and timestamp are returned.
    /// @param startIndex  First patient index (inclusive)
    /// @param endIndex    Last patient index (exclusive)
    function getAnonymizedBatch(uint256 startIndex, uint256 endIndex)
        external
        onlyResearcher
        returns (AnonymizedRecord[] memory)
    {
        require(startIndex < endIndex, "Invalid range");
        uint256 total = patientAddresses.length;
        if (endIndex > total) endIndex = total;

        // Count total records in range first (to size the array)
        uint256 count = 0;
        for (uint256 i = startIndex; i < endIndex; i++) {
            count += patients[patientAddresses[i]].records.length;
        }

        AnonymizedRecord[] memory batch = new AnonymizedRecord[](count);
        uint256 idx = 0;

        for (uint256 i = startIndex; i < endIndex; i++) {
            Patient storage p = patients[patientAddresses[i]];
            for (uint256 j = 0; j < p.records.length; j++) {
                MedicalRecord storage rec = p.records[j];
                batch[idx] = AnonymizedRecord({
                    timestamp: rec.timestamp,
                    recordType: rec.recordType,
                    description: rec.description,
                    institution: rec.institution,
                    bloodType: p.bloodType,
                    gender: p.gender,
                    patientIndex: i   // opaque integer, not a wallet address
                });
                idx++;
            }
        }

        researchers[msg.sender].dataAccessCount++;
        emit DatasetAccessed(msg.sender, count, block.timestamp);
        return batch;
    }

    /// @notice Returns demographic summary counts per blood type and gender (fully aggregated, no PII)
    function getDemographicsSummary() external view onlyResearcher returns (
        string[] memory bloodTypes,
        uint256[] memory bloodTypeCounts,
        uint256 maleCount,
        uint256 femaleCount,
        uint256 otherCount
    ) {
        string[8] memory BT = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        uint256[8] memory btCounts;
        uint256 males;
        uint256 females;
        uint256 others;

        for (uint256 i = 0; i < patientAddresses.length; i++) {
            Patient storage p = patients[patientAddresses[i]];

            // Gender
            bytes32 g = keccak256(bytes(p.gender));
            if (g == keccak256(bytes("Male"))) males++;
            else if (g == keccak256(bytes("Female"))) females++;
            else others++;

            // Blood type
            bytes32 bt = keccak256(bytes(p.bloodType));
            for (uint256 k = 0; k < 8; k++) {
                if (bt == keccak256(bytes(BT[k]))) { btCounts[k]++; break; }
            }
        }

        bloodTypes = new string[](8);
        bloodTypeCounts = new uint256[](8);
        for (uint256 k = 0; k < 8; k++) {
            bloodTypes[k] = BT[k];
            bloodTypeCounts[k] = btCounts[k];
        }

        return (bloodTypes, bloodTypeCounts, males, females, others);
    }

    /// @notice Returns total count of records per type across all patients (no PII)
    function getRecordTypeBreakdown() external view onlyResearcher returns (
        string[] memory recordTypes,
        uint256[] memory counts
    ) {
        string[8] memory RT = ["Diagnosis", "Lab Result", "Prescription", "Vaccination", "Surgery", "Imaging", "Allergy", "Other"];
        uint256[8] memory rtCounts;

        for (uint256 i = 0; i < patientAddresses.length; i++) {
            Patient storage p = patients[patientAddresses[i]];
            for (uint256 j = 0; j < p.records.length; j++) {
                bytes32 rt = keccak256(bytes(p.records[j].recordType));
                for (uint256 k = 0; k < 8; k++) {
                    if (rt == keccak256(bytes(RT[k]))) { rtCounts[k]++; break; }
                }
            }
        }

        recordTypes = new string[](8);
        counts = new uint256[](8);
        for (uint256 k = 0; k < 8; k++) {
            recordTypes[k] = RT[k];
            counts[k] = rtCounts[k];
        }

        return (recordTypes, counts);
    }

    /// @notice Returns an array of monthly record counts (last 12 months, UNIX timestamps bucketed by 30-day windows)
    function getTimelineData() external view onlyResearcher returns (
        uint256[12] memory monthTimestamps,
        uint256[12] memory monthlyCounts
    ) {
        uint256 now_ = block.timestamp;
        uint256 bucket = 30 days;

        for (uint256 m = 0; m < 12; m++) {
            monthTimestamps[m] = now_ - (11 - m) * bucket;
        }

        for (uint256 i = 0; i < patientAddresses.length; i++) {
            Patient storage p = patients[patientAddresses[i]];
            for (uint256 j = 0; j < p.records.length; j++) {
                uint256 ts = p.records[j].timestamp;
                for (uint256 m = 0; m < 12; m++) {
                    uint256 start = now_ - (12 - m) * bucket;
                    uint256 end_  = now_ - (11 - m) * bucket;
                    if (ts >= start && ts < end_) {
                        monthlyCounts[m]++;
                        break;
                    }
                }
            }
        }
    }

    /// @notice Returns total number of registered patients (public, for UI)
    function getTotalPatients() external view returns (uint256) {
        return patientAddresses.length;
    }
}