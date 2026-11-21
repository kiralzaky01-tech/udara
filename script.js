
const citySearch = document.getElementById("citySearch");
const citySuggestions = document.getElementById("citySuggestions");
const searchButton = document.getElementById("searchButton");
const statusMessage = document.getElementById("statusMessage");
const dashboardContent = document.getElementById("dashboardContent");

let airChart = null;

const defaultCity = {
    name: "Medan",
    country: "Indonesia",
    latitude: 3.5952,
    longitude: 98.6722
};

document.getElementById("currentDate").textContent =
    new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full"
    }).format(new Date());

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
}

function formatNumber(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    return Number(value).toFixed(1);
}

function getAqiCategory(aqi) {
    if (aqi <= 50) {
        return {
            name: "Baik",
            description: "Kualitas udara baik",
            color: "#16a36a",
            background: "#e9f8f0",
            recommendation: "Kualitas udara tergolong baik.",
            detail: "Aktivitas di luar ruangan umumnya dapat dilakukan seperti biasa."
        };
    }

    if (aqi <= 100) {
        return {
            name: "Sedang",
            description: "Kualitas udara sedang",
            color: "#d6a323",
            background: "#fff8df",
            recommendation: "Kualitas udara masih dapat diterima.",
            detail: "Sebagian kecil orang yang sensitif mungkin perlu membatasi aktivitas berat di luar ruangan."
        };
    }

    if (aqi <= 150) {
        return {
            name: "Tidak Sehat bagi Kelompok Sensitif",
            description: "Perlu diperhatikan",
            color: "#ed9638",
            background: "#fff1e4",
            recommendation: "Kelompok sensitif perlu berhati-hati.",
            detail: "Anak-anak dan orang dengan gangguan pernapasan sebaiknya mengurangi aktivitas berat di luar ruangan."
        };
    }

    if (aqi <= 200) {
        return {
            name: "Tidak Sehat",
            description: "Kualitas udara tidak sehat",
            color: "#e34d59",
            background: "#ffe9eb",
            recommendation: "Kurangi aktivitas di luar ruangan.",
            detail: "Pertimbangkan menggunakan masker yang sesuai jika harus berada di luar ruangan."
        };
    }

    if (aqi <= 300) {
        return {
            name: "Sangat Tidak Sehat",
            description: "Kualitas udara sangat tidak sehat",
            color: "#9b59b6",
            background: "#f4e9fa",
            recommendation: "Hindari aktivitas di luar ruangan.",
            detail: "Usahakan tetap berada di dalam ruangan dan tutup jendela jika kondisi udara memburuk."
        };
    }

    return {
        name: "Berbahaya",
        description: "Kualitas udara berbahaya",
        color: "#7e2637",
        background: "#f8e7eb",
        recommendation: "Hindari paparan udara luar.",
        detail: "Tetap berada di dalam ruangan dan ikuti informasi dari otoritas setempat."
    };
}

function getPmCategory(value) {
    if (value <= 12) return "Rendah";
    if (value <= 35) return "Sedang";
    if (value <= 55) return "Tinggi";
    return "Sangat Tinggi";
}

function getHourlyValue(data, index) {
    const value = data.hourly.pm2_5[index];

    return value === null || value === undefined
        ? null
        : Number(value);
}

async function searchCity(cityName) {
    if (!cityName.trim()) {
        setStatus("Masukkan nama kota terlebih dahulu.", true);
        return;
    }

    try {
        searchButton.disabled = true;
        setStatus("Sedang mencari lokasi...");

        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=10&language=id&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Gagal mencari lokasi.");
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error("Kota tidak ditemukan. Coba nama kota lainnya.");
        }

        citySuggestions.innerHTML = "";

        data.results.forEach(city => {
            const option = document.createElement("option");

            option.value = city.name;
            option.label = `${city.name}, ${city.country || ""}`;

            citySuggestions.appendChild(option);
        });

        const selectedCity =
            data.results.find(city =>
                city.name.toLowerCase() === cityName.trim().toLowerCase()
            ) || data.results[0];

        const city = {
            name: selectedCity.name,
            country: selectedCity.country || "",
            latitude: selectedCity.latitude,
            longitude: selectedCity.longitude
        };

        await loadAirQuality(city);

    } catch (error) {
        setStatus(error.message, true);
    } finally {
        searchButton.disabled = false;
    }
}

async function loadAirQuality(city) {
    try {
        setStatus("Mengambil data kualitas udara...");
        searchButton.disabled = true;

        const url =
            `https://air-quality-api.open-meteo.com/v1/air-quality` +
            `?latitude=${city.latitude}` +
            `&longitude=${city.longitude}` +
            `&current=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi` +
            `&hourly=pm2_5` +
            `&forecast_days=5` +
            `&timezone=auto`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Gagal mengambil data kualitas udara.");
        }

        const data = await response.json();

        if (!data.current || !data.hourly) {
            throw new Error("Data kualitas udara tidak tersedia untuk lokasi ini.");
        }

        dashboardContent.hidden = false;

        document.getElementById("locationTitle").textContent =
            `${city.name}, ${city.country}`;

        updateCurrentAir(data);
        updateChart(data);
        updateTable(data);
        updateForecast(data);

        setStatus(
            `Data kualitas udara untuk ${city.name} berhasil diperbarui.`
        );

    } catch (error) {
        setStatus(error.message, true);
    } finally {
        searchButton.disabled = false;
    }
}

function updateCurrentAir(data) {
    const current = data.current;

    const aqi = current.us_aqi;

    const category = getAqiCategory(aqi);

    document.getElementById("aqiValue").textContent =
        aqi ?? "--";

    document.getElementById("aqiCategory").textContent =
        category.name;

    document.getElementById("aqiCategory").style.color =
        category.color;

    document.getElementById("aqiCategory").style.background =
        category.background;

    document.getElementById("aqiDescription").textContent =
        category.description;

    document.getElementById("recommendationText").textContent =
        category.recommendation;

    document.getElementById("recommendationTitle").textContent =
        "Rekomendasi Aktivitas";

    document.getElementById("recommendationDetail").textContent =
        category.detail;

    const percentage = Math.min((Number(aqi) / 300) * 360, 360);

    document.getElementById("aqiCircle").style.background =
        `conic-gradient(${category.color} ${percentage}deg, #e9edf4 ${percentage}deg)`;

    document.getElementById("summaryAqi").textContent =
        aqi ?? "--";

    const pollutants = {
        pm25: current.pm2_5,
        pm10: current.pm10,
        co: current.carbon_monoxide,
        no2: current.nitrogen_dioxide,
        so2: current.sulphur_dioxide,
        o3: current.ozone
    };

    document.getElementById("pm25").textContent =
        formatNumber(pollutants.pm25);

    document.getElementById("pm10").textContent =
        formatNumber(pollutants.pm10);

    document.getElementById("co").textContent =
        formatNumber(pollutants.co);

    document.getElementById("no2").textContent =
        formatNumber(pollutants.no2);

    document.getElementById("so2").textContent =
        formatNumber(pollutants.so2);

    document.getElementById("o3").textContent =
        formatNumber(pollutants.o3);

    document.getElementById("summaryPm25").textContent =
        `${formatNumber(pollutants.pm25)} µg/m³`;

    document.getElementById("summaryPm10").textContent =
        `${formatNumber(pollutants.pm10)} µg/m³`;

    document.getElementById("summaryO3").textContent =
        `${formatNumber(pollutants.o3)} µg/m³`;

    document.getElementById("chartCurrentValue").textContent =
        `${formatNumber(pollutants.pm25)} µg/m³`;
}

function updateChart(data) {
    const hourly = data.hourly;

    const currentTime = new Date(data.current.time).getTime();

    const points = [];

    for (let i = 0; i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]).getTime();

        if (time > currentTime) {
            break;
        }

        const value = getHourlyValue(data, i);

        if (value !== null && Number.isFinite(value)) {
            points.push({
                time: hourly.time[i],
                value: value
            });
        }
    }

    const last24Hours = points.slice(-24);

    const labels = last24Hours.map(point => {
        return new Date(point.time).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    });

    const values = last24Hours.map(point => point.value);

    const canvas = document.getElementById("airChart");

    if (airChart) {
        airChart.destroy();
        airChart = null;
    }

    const context = canvas.getContext("2d");

    airChart = new Chart(context, {
        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: "PM2.5",
                data: values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.10)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#2563eb",
                pointBorderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#172033",
                    padding: 12,
                    titleFont: {
                        size: 11
                    },
                    bodyFont: {
                        size: 11
                    },
                    callbacks: {
                        label: function(context) {
                            return ` PM2.5: ${context.raw} µg/m³`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#98a2b3",
                        maxTicksLimit: 8,
                        font: {
                            size: 10
                        }
                    }
                },

                y: {
                    beginAtZero: true,
                    grid: {
                        color: "#edf0f5"
                    },
                    ticks: {
                        color: "#98a2b3",
                        font: {
                            size: 10
                        }
                    },
                    title: {
                        display: true,
                        text: "PM2.5 (µg/m³)",
                        color: "#8490a5"
                    }
                }
            }
        }
    });

    document.getElementById("chartUpdate").textContent =
        `Menampilkan ${values.length} data pengukuran terakhir.`;
}

function updateTable(data) {
    const hourly = data.hourly;
    const currentTime = new Date(data.current.time).getTime();

    const points = [];

    for (let i = 0; i < hourly.time.length; i++) {
        const time = new Date(hourly.time[i]).getTime();

        if (time > currentTime) {
            break;
        }

        const value = getHourlyValue(data, i);

        if (value !== null && Number.isFinite(value)) {
            points.push({
                time: hourly.time[i],
                value: value
            });
        }
    }

    const recentData = points.slice(-24).reverse();

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Waktu</th>
                    <th>PM2.5</th>
                    <th>Kategori</th>
                </tr>
            </thead>
            <tbody>
    `;

    recentData.forEach(point => {
        const time = new Date(point.time).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });

        const category = getPmCategory(point.value);

        html += `
            <tr>
                <td>${time}</td>
                <td>${formatNumber(point.value)} µg/m³</td>
                <td class="table-category">${category}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    document.getElementById("chartTable").innerHTML = html;
}

function updateForecast(data) {
    const hourly = data.hourly;
    const dailyData = {};

    const now = new Date(data.current.time);
    const today = now.toISOString().slice(0, 10);

    hourly.time.forEach((time, index) => {
        const date = time.slice(0, 10);
        const value = hourly.pm2_5[index];

        if (date < today || value === null || value === undefined) {
            return;
        }

        if (!dailyData[date]) {
            dailyData[date] = [];
        }

        dailyData[date].push(Number(value));
    });

    const forecastGrid = document.getElementById("forecastGrid");

    forecastGrid.innerHTML = "";

    const dates = Object.keys(dailyData).slice(0, 5);

    if (dates.length === 0) {
        forecastGrid.textContent = "Prediksi belum tersedia.";
        return;
    }

    dates.forEach(date => {
        const values = dailyData[date];

        const average =
            values.reduce((total, value) => total + value, 0) /
            values.length;

        const category = getPmCategory(average);

        const formattedDate = new Date(date + "T12:00:00").toLocaleDateString(
            "id-ID",
            {
                weekday: "short",
                day: "numeric",
                month: "short"
            }
        );

        const card = document.createElement("div");

        card.className = "forecast-card";

        const day = document.createElement("p");
        day.className = "forecast-day";
        day.textContent = formattedDate;

        const value = document.createElement("h3");
        value.className = "forecast-value";
        value.textContent = formatNumber(average);

        const unit = document.createElement("p");
        unit.className = "forecast-unit";
        unit.textContent = "Rata-rata PM2.5 (µg/m³)";

        const badge = document.createElement("span");
        badge.className = "forecast-category";
        badge.textContent = category;

        card.append(day, value, unit, badge);

        forecastGrid.appendChild(card);
    });
}

searchButton.addEventListener("click", () => {
    searchCity(citySearch.value);
});

citySearch.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchCity(citySearch.value);
    }
});

loadAirQuality(defaultCity);
