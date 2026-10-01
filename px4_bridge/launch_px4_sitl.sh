#!/bin/bash
# ==============================================================================
# Helper Script to Launch PX4 SITL with Gazebo Rover Model & ROS 2 Bridge
# ==============================================================================

echo "======================================================================"
echo "Starting PX4 SITL & Gazebo Rover Simulation"
echo "======================================================================"

# 1. Check if PX4-Autopilot directory exists
if [ -d "$HOME/PX4-Autopilot" ]; then
    cd "$HOME/PX4-Autopilot" || exit
else
    echo "PX4-Autopilot repository not found in $HOME/PX4-Autopilot."
    echo "Please clone it via: git clone https://github.com/PX4/PX4-Autopilot.git --recursive"
    exit 1
fi

# 2. Launch PX4 Rover SITL with Gazebo
echo "Launching PX4 SITL with Gazebo Rover model..."
echo "Target UDP Port: 14540 (Ready for Bridge Connection)"
make px4_sitl gz_rover