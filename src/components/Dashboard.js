import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs } from 'firebase/firestore';
import { app, db } from '../firebase'; 
import './styles.css'; 
import TemperatureChart from './TemperatureChart'; 
import Highlights from './Highlights'; 
import Medication from './Medication'; 

const functions = getFunctions(app);

export const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [temperatureData, setTemperatureData] = useState([]);
  const [medicationData, setMedicationData] = useState([]);

  useEffect(() => {
    const fetchPatients = async () => {
      const getPatientData = httpsCallable(functions, 'getPatientData');
      try {
        const result = await getPatientData();
        setPatients(result.data.patients);
        setSelectedPatient(result.data.patients[0]);
      } catch (error) {
        console.error('Error fetching patient data:', error);
      }
    };

    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      // Fetch temperature data for the selected patient
      const fetchTemperatureData = async () => {
        const patientDocRef = doc(db, 'patients', selectedPatient.id);
        const bodyTemperaturesColRef = collection(patientDocRef, 'body_temperatures');
        const bodyTemperaturesSnapshot = await getDocs(bodyTemperaturesColRef);
        const temperatures = bodyTemperaturesSnapshot.docs.map(doc => {
          const data = doc.data();
          return { date: data.date, temperature: data.temperature };
        });
        temperatures.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
        setTemperatureData(temperatures);
      };

      fetchTemperatureData();

      // Fetch medication data for the selected patient
      const fetchMedicationData = async () => {
        const patientDocRef = doc(db, 'patients', selectedPatient.id);
        const medicationsColRef = collection(patientDocRef, 'medications');
        const medicationsSnapshot = await getDocs(medicationsColRef);
        const medications = medicationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMedicationData(medications);
      };

      fetchMedicationData();
    }
  }, [selectedPatient]);

  const handleNewTemperatureAdded = (newTemperatures) => {
    setTemperatureData(newTemperatures);
  };

  const handleTemperatureUpdated = (updatedTemperature) => {
    const updatedTemperatures = temperatureData.map(temp => 
      temp.date === updatedTemperature.date ? updatedTemperature : temp
    );
    setTemperatureData(updatedTemperatures);
  };

  const handleNewMedicationAdded = (newMedications) => {
    setMedicationData(newMedications);
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Patients</h2>
        {patients.map((patient) => (
          <div 
            key={patient.id} 
            className={`patient-container ${selectedPatient && selectedPatient.id === patient.id ? 'selected' : ''}`} 
            onClick={() => setSelectedPatient(patient)}
          >
            {patient.first_name}
          </div>
        ))}
      </div>
      <div className="content">
        <div className="patient-info">
          {selectedPatient && (
            <div>
              <div>{selectedPatient.first_name}, {selectedPatient.age}</div>
              <div>{selectedPatient.height} cm, {selectedPatient.weight} kg, {selectedPatient.gender}</div>
            </div>
          )}
        </div>
        <div className="highlights-medication-row">
          <Highlights
            selectedPatient={selectedPatient}
            db={db}
            onNewTemperatureAdded={handleNewTemperatureAdded}
            temperatureData={temperatureData} // Pass temperature data to Highlights
          />
          <Medication 
            medicationData={medicationData}
            selectedPatient={selectedPatient}
            db={db}
            onNewMedicationAdded={handleNewMedicationAdded}
          />
        </div>
        {selectedPatient && (
          <TemperatureChart
            temperatureData={temperatureData}
            selectedPatient={selectedPatient} // Pass the selectedPatient prop
            onTemperatureUpdated={handleTemperatureUpdated} // Pass the update callback
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;



