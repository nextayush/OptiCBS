# OptiCBS: Autonomous Logistics Simulator

![Tech Stack](https://img.shields.io/badge/Stack-React_|_FastAPI_|_Docker-teal?style=for-the-badge)

**OptiCBS** is a high-performance **Multi-Agent Pathfinding (MAPF)** simulation suite designed to solve complex warehousing logistics problems. It simulates autonomous robot fleets (AMRs) navigating a grid, avoiding collisions, and optimizing traffic flow using advanced algorithms like **Conflict-Based Search (CBS)** and **Prioritized Planning**.

---

## 🚀 Features

### 🧠 Algorithmic Core
* **Optimal Solver (CBS):** Uses *Conflict-Based Search* to find mathematically optimal paths for small robot fleets ($k \le 10$).
* **Fast Solver (Priority Planning):** Switches to *Prioritized Planning* for large swarms ($k > 10$), enabling instant solutions for 20+ agents.
* **Kinematic Awareness:** Agents respect physical constraints—they must stop and rotate to change direction.

### 🎮 Interactive Sandbox (Digital Twin)
* **Dynamic Configuration:** Adjust grid size (5x5 to 30x30) and fleet size (1-20 agents) on the fly.
* **Map Editor:** Click-to-draw obstacles to test edge cases (e.g., narrow corridors, bottlenecks).
* **Real-Time Telemetry:** Visual battery levels, task states (Idle/Carrying), and path costs.

### 📊 Analytics
* **Congestion Heatmaps:** Overlay real-time traffic density data to identify warehouse bottlenecks.
* **Explainable AI (XAI):** A decision log that translates algorithmic moves into human-readable text (e.g., *"Agent 5 waits at (4,2) to let Agent 3 pass"*).

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React 18 (Vite)
* **Styling:** Tailwind CSS (Dark/Light Mode capable)
* **Visualization:** HTML5 Canvas (Optimized for 60fps rendering)
* **Icons:** Lucide React

### **Backend**
* **Language:** Python 3.9
* **API:** FastAPI (Async)
* **Algorithms:** Custom implementations of Space-Time A*, CBS, and Conflict Detection.
* **Architecture:** REST API with Pydantic validation.

### **DevOps**
* **Containerization:** Docker & Docker Compose
* **Orchestration:** Multi-container setup with volume mapping for hot-reloading.

---

## ⚡ Quick Start (Recommended)

Run the entire suite (Frontend + Backend) with a single command using Docker.

### Prerequisites
* Docker Desktop installed and running.

### Installation
1.  **Clone the repository**
    ```bash
    git clone https://github.com/nextayush/OptiCBS.git
    cd OptiCBS
    ```

2.  **Start the application**
    ```bash
    docker-compose up --build
    ```

3.  **Access the Dashboard**
    * Frontend: [http://localhost:3000](http://localhost:3000)
    * API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔧 Manual Installation (No Docker)

If you prefer running locally without Docker:

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
