# SafetyStudioWeb 🛡️🤖

**SafetyStudioWeb** is a professional engineering platform designed to automate the configuration of safety fields for Autonomous Mobile Robots (AMRs) and Automated Guided Vehicles (AGVs). It bridges the gap between mechanical CAD design and functional safety deployment.

## 🚀 Overview

Configuring safety LiDARs (like SICK or Leuze) for mobile robots is traditionally a manual, error-prone process. SafetyStudioWeb automates this by using kinematic motion models to calculate precise "protective zones" (Safety Fields) based on the robot's real-world physics, payload geometry, and environment.

### Key Features

- **📐 CAD Integration**: Import robot footprints and environment geometry directly from DXF files.
- **🕒 Kinematic Modeling**: Calculate safety fields based on:
  - Velocity ($v$) and Angular Velocity ($\omega$)
  - Braking Acceleration ($a_c$)
  - System Response Time ($t_r$)
  - Safety Margins ($d_s$)
- **🌑 Shadow Generation**: Automatically detect and compensate for sensor occlusions caused by the robot's own structure or payload.
- **🛠️ Parametric Sketching**: Built-in 2D editor for defining and refining robot geometry.
- **📥 Hardware Export**: Generate vendor-specific configuration files:
  - **SICK**: `.sdxml` and `.casesxml` formats.
  - **Leuze**: `.csv` point clouds.
- **🐳 Containerized**: Ready for deployment via Docker and Docker Compose.

---

## 🛠️ Tech Stack

- **Frontend**: React, Konva (Canvas API), Axios
- **Backend**: Python (Flask), Shapely (Geometric Solver), NumPy, ezdxf
- **Deployment**: Docker, Nginx

---

## 🚦 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Docker** (Optional, for containerized deployment)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd SafetyStudioWeb
   ```

2. **Run the launch script**:
   The `launch.sh` script handles both the frontend and backend setup:
   ```bash
   chmod +x launch.sh
   ./launch.sh
   ```
   - Backend will be available at: `http://localhost:5000`
   - Frontend will be available at: `http://localhost:3000`

### Docker Deployment

To run the entire stack in production mode:
```bash
docker compose up --build
```
Access the application at `http://localhost`.

---

## 📖 How it Works

1. **Phase 1: Editor**: Define your robot's footprint and any static loads. Configure your LiDAR sensor positions and FOVs.
2. **Phase 2: Matrix**: Define your "Evaluation Matrix"—a grid of speed/angle combinations the robot will operate in.
3. **Phase 3: Generation**: The engine simulates the robot's stopping trajectory for every case and generates a "Swept Union" polygon.
4. **Phase 4: Validation**: Review the generated fields, manually patch vertices if needed using the CAD tools, and verify shadow regions.
5. **Phase 5: Export**: Pack and download the configuration for your specific hardware.

---

## 📁 Project Structure

```text
.
├── app.py              # Flask API & Export Logic
├── core.py             # Geometric Solver & Safety Math
├── caseExport.py       # Vendor XML generation
├── src/                # React Frontend Source
│   ├── components/     # UI Components (Editor, Matrix, Results)
│   └── assets/         # CSS and UI Assets
├── public/             # Static Assets & Manual Images
├── Dockerfile.backend  # Python Environment
├── Dockerfile.frontend # React/Nginx Build
└── docker-compose.yml  # Multi-container Orchestration
```

---

## 📄 License

This project is proprietary. All rights reserved.

---
*Built with ❤️ for the future of Safe Robotics.*
