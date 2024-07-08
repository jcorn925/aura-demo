import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, getDocs } from 'firebase/firestore';

const Highlights = ({ selectedPatient, db, onNewTemperatureAdded, temperatureData }) => {
  const [newTemperature, setNewTemperature] = useState('');
  const [newTemperatureDate, setNewTemperatureDate] = useState('');
  const [averageTemp, setAverageTemp] = useState(0);
  const [lastTemp, setLastTemp] = useState(0);
  const [lastTempDate, setLastTempDate] = useState('');

  useEffect(() => {
    if (temperatureData.length > 0) {
      const totalTemp = temperatureData.reduce((total, item) => {
        const temp = parseFloat(item.temperature);
        return total + temp;
      }, 0);

      const avgTemp = totalTemp / temperatureData.length;
      setAverageTemp(avgTemp);

      const lastTemperature = parseFloat(temperatureData[temperatureData.length - 1].temperature);
      const lastTemperatureDate = new Date(temperatureData[temperatureData.length - 1].date).toLocaleDateString();
      setLastTemp(lastTemperature);
      setLastTempDate(lastTemperatureDate);

      const mostRecentDate = new Date(temperatureData[temperatureData.length - 1].date);
      const nextDate = new Date(mostRecentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      setNewTemperatureDate(nextDate.toISOString().split('T')[0]);
    }
  }, [temperatureData]);

  const handleAddTemperature = async () => {
    if (newTemperature && newTemperatureDate && selectedPatient) {
      // Check if the date already exists
      const dateExists = temperatureData.some(
        (item) => item.date === newTemperatureDate
      );

      if (dateExists) {
        alert('A temperature for this date already exists.');
        return;
      }

      const patientDocRef = doc(db, 'patients', selectedPatient.id);
      const bodyTemperaturesColRef = collection(patientDocRef, 'body_temperatures');
      await addDoc(bodyTemperaturesColRef, {
        date: new Date(newTemperatureDate).toISOString().split('T')[0], // Ensure correct date format
        temperature: parseFloat(newTemperature),
      });
      setNewTemperature('');
      const nextDate = new Date(newTemperatureDate);
      nextDate.setDate(nextDate.getDate() + 1);
      setNewTemperatureDate(nextDate.toISOString().split('T')[0]);

      const bodyTemperaturesSnapshot = await getDocs(bodyTemperaturesColRef);
      const temperatures = bodyTemperaturesSnapshot.docs.map(doc => {
        const data = doc.data();
        return { date: data.date, temperature: parseFloat(data.temperature) }; // Ensure temperature is parsed as float
      });
      temperatures.sort((a, b) => new Date(a.date) - new Date(b.date));
      onNewTemperatureAdded(temperatures);
    }
  };

  return (
    <div className="highlights">
      <h2>Highlights</h2>
      <div className="temperature-container">
        <div className="temperature-box">
          <label>Average Temp</label>
          <div className="temperature-value">{averageTemp.toFixed(2)}°C</div>
        </div>
        <div className="temperature-box">
          <label>Last Temp ({lastTempDate})</label>
          <div className="temperature-value">{lastTemp.toFixed(2)}°C</div>
        </div>
      </div>
      <div className="new-temperature-inputs">
        <input
          type="number"
          placeholder="New Temperature"
          value={newTemperature}
          onChange={(e) => setNewTemperature(e.target.value)}
        />
        <input
          type="date"
          value={newTemperatureDate}
          onChange={(e) => setNewTemperatureDate(e.target.value)}
        />
        <button onClick={handleAddTemperature}>Add Temperature</button>
      </div>
    </div>
  );
};

export default Highlights;


