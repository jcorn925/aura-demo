import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from '../firebase'; // Adjust the path if needed
import './styles.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const TemperatureChart = ({ temperatureData, selectedPatient, onTemperatureUpdated }) => {
  const [filteredTemperatureData, setFilteredTemperatureData] = useState({ labels: [], data: [] });
  const [scale, setScale] = useState('1M');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [newTemperature, setNewTemperature] = useState('');

  useEffect(() => {
    if (temperatureData && temperatureData.length > 0) {
      filterTemperatureData(temperatureData, scale);
    }
  }, [temperatureData, scale]);

  const filterTemperatureData = (data, scale) => {
    const mostRecentDate = new Date(Math.max(...data.map(temp => new Date(temp.date))));
    let startDate = new Date(mostRecentDate);

    switch (scale) {
      case '1M':
        startDate.setMonth(mostRecentDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(mostRecentDate.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(mostRecentDate.getMonth() - 6);
        break;
      default:
        startDate = new Date(data[0]?.date || mostRecentDate);
    }

    const filteredData = data.filter(temp => new Date(temp.date) >= startDate && new Date(temp.date) <= mostRecentDate);
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

    const timeLine = [];
    for (let d = new Date(startDate); d <= mostRecentDate; d.setDate(d.getDate() + 1)) {
      timeLine.push(new Date(d));
    }

    const chartData = timeLine.map(date => {
      const temp = filteredData.find(t => new Date(t.date).toDateString() === date.toDateString());
      return temp ? temp.temperature : null;
    });

    setFilteredTemperatureData({ labels: timeLine, data: chartData });
  };

  const handleScaleChange = (newScale) => {
    setScale(newScale);
    filterTemperatureData(temperatureData, newScale);
  };

  const handlePointClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const clickedDate = filteredTemperatureData.labels[index];
      const clickedTemperature = filteredTemperatureData.data[index];
      setSelectedPoint({ date: new Date(clickedDate), index });  // Convert string date to Date object
      setNewTemperature(clickedTemperature);
    }
  };

  const handleTemperatureChange = (event) => {
    setNewTemperature(event.target.value);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const updatedData = [...filteredTemperatureData.data];
    updatedData[selectedPoint.index] = newTemperature;
    setFilteredTemperatureData({ ...filteredTemperatureData, data: updatedData });

    const formattedDate = selectedPoint.date.toISOString().split('T')[0];
    const tempCollectionRef = collection(db, "patients", selectedPatient.id, "body_temperatures");
    const q = query(tempCollectionRef, where("date", "==", formattedDate));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const tempDocRef = querySnapshot.docs[0].ref;
        await updateDoc(tempDocRef, {
          temperature: newTemperature
        });
        onTemperatureUpdated({ date: formattedDate, temperature: newTemperature });
      } else {
        console.error("No document found with the specified date:", formattedDate);
      }
    } catch (error) {
      console.error('Error updating document:', error);
    }

    setSelectedPoint(null);
  };

  const handleCancel = () => {
    setSelectedPoint(null);
  };

  const chartData = {
    labels: filteredTemperatureData.labels.map(date => date.toLocaleDateString('en-US', { timeZone: 'UTC' })),
    datasets: [
      {
        label: 'Temperature',
        data: filteredTemperatureData.data,
        fill: false,
        backgroundColor: 'rgba(75,192,192,1)',
        borderColor: 'rgba(75,192,192,1)',
        pointHoverBackgroundColor: 'rgba(75,192,192,1)',
        pointHoverBorderColor: 'rgba(75,192,192,1)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        enabled: true,
      },
      legend: {
        display: true,
      },
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Temperature (°C)',
        },
      },
    },
    onClick: (event, elements) => handlePointClick(event, elements),
  };

  return (
    <div className="temperature-graphic">
      <h2>Temperature Graphic</h2>
      <div className="scale-buttons">
        <button
          className={`scale-button ${scale === '1M' ? 'selected' : ''}`}
          onClick={() => handleScaleChange('1M')}
        >
          1 Month
        </button>
        <button
          className={`scale-button ${scale === '3M' ? 'selected' : ''}`}
          onClick={() => handleScaleChange('3M')}
        >
          3 Months
        </button>
        <button
          className={`scale-button ${scale === '6M' ? 'selected' : ''}`}
          onClick={() => handleScaleChange('6M')}
        >
          6 Months
        </button>
      </div>
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
        {selectedPoint && (
          <form onSubmit={handleFormSubmit} className="temperature-form">
            <h3>Edit Temperature</h3>
            <label>
              Date: {selectedPoint.date.toLocaleDateString('en-US', { timeZone: 'UTC' })}
            </label>
            <input
              type="number"
              value={newTemperature}
              onChange={handleTemperatureChange}
              required
            />
            <div className="form-buttons">
              <button type="submit">Save</button>
              <button type="button" onClick={handleCancel}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TemperatureChart;



