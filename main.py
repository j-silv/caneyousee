from indistinguishable_from_magic import magic as Magic
import time
import numpy as np
import argparse
import random
from enum import Enum

class State(Enum):
    NORMAL = "normal"
    THRESHOLD_EXCEEDED = "threshold_exceeded"

def convert(datum, units="mm"):
    """Convert units of distance data"""

    if units == "mm":
            return datum
    
    if units == "feet":
        return datum / 304.8
    
    raise ValueError("Invalid units", units)

def dummy_device_read(minval=600, maxval=1400, delay_ms=100):
    """Returns a random distance value (in mm)"""

    datum = random.uniform(minval, maxval)
    time.sleep(delay_ms / 1000)
    return datum

def device_read(device, port=6):
    """Returns a distance value (in mm)"""

    ports = device.read()
    datum = ports[port]["module"]["properties"]["position"]
    return datum

def calibrate(cal_time, device, port=6, dummy=True, units="mm"):
    """Measure and gather distance data from port for cal_time seconds"""

    start = time.time()
    data = []
    
    while (time.time() - start) < cal_time:

        if dummy: 
            datum = dummy_device_read()
        else:
            datum = device_read(device, port)

        datum = convert(datum, units)
        data.append(datum)

    return data

def main():
    parser = argparse.ArgumentParser(
        description="Calibrate and read sensor data from device",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "-i",
        "--device",
        type=str,
        default="/dev/cu.Leopard",
        help="Device path (default: %(default)s)"
    )
    parser.add_argument(
        "-c",
        "--cal-time",
        type=float,
        default=5.0,
        help="Calibration time in seconds (default: %(default)s)"
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=6,
        help="Port number to read from (default: %(default)s)"
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=float,
        default=1,
        help=("Absolute distance threshold (in feet) for vibration detection.\n"
             "If the current distance is +/- within the average baseline distance,\n"
             "this counts as a vibration trigger.\n"
             "(default: %(default)s feet)")
    )
    parser.add_argument(
        "-u",
        "--units",
        type=str,
        choices=["mm", "feet"],
        default="feet",
        help="Units for distance measurements (default: %(default)s)"
    )
    parser.add_argument(
        "-b",
        "--debounce-count",
        type=int,
        default=5,
        help="Number of consecutive measurements exceeding threshold before triggering (default: %(default)s)"
    )
    parser.add_argument(
        "-d",
        "--dummy",
        action="store_true",
        help="Use dummy device read instead of actual device (default: False)"
    )
    args = parser.parse_args()

    device = Magic.Device(args.device)
    device.connect()

    print(f"Calibrating for {args.cal_time} seconds on port {args.port}...")
    data = calibrate(args.cal_time, device, args.port, dummy=args.dummy, units=args.units)

    baseline = np.mean(data)
    # Convert threshold to the selected units (threshold default is in feet)
    threshold_converted = convert(args.threshold * 304.8, args.units)
    print(f"Baseline: {baseline:.2f} {args.units}")
    print(f"Threshold: {threshold_converted:.2f} {args.units}")
    print(f"Debounce count: {args.debounce_count} measurements")
    print(f"Monitoring for trigger...\n")

    # State machine
    state = State.NORMAL
    exceeded_count = 0

    while True:
        if args.dummy:
            distance = dummy_device_read()
        else:
            distance = device_read(device, args.port)

        distance = convert(distance, args.units)
        is_threshold_exceeded = abs(distance - baseline) > threshold_converted

        if state == State.NORMAL:
            if is_threshold_exceeded:
                # Transition to THRESHOLD_EXCEEDED state
                state = State.THRESHOLD_EXCEEDED
                exceeded_count = 1
                print(f"Position: {distance:.2f} {args.units} - Threshold exceeded (baseline: {baseline:.2f} {args.units})")
            else:
                print(f"Position: {distance:.2f} {args.units}")

        elif state == State.THRESHOLD_EXCEEDED:
            if is_threshold_exceeded:
                # Still exceeding threshold, increment count
                exceeded_count += 1
                if exceeded_count >= args.debounce_count:
                    print(f"Position: {distance:.2f} {args.units} - VIBRATION DETECTED! (baseline: {baseline:.2f} {args.units})")
                else:
                    print(f"Position: {distance:.2f} {args.units} - Threshold exceeded ({exceeded_count}/{args.debounce_count})")
            else:
                # Threshold no longer exceeded, transition back to NORMAL
                state = State.NORMAL
                exceeded_count = 0
                print(f"Position: {distance:.2f} {args.units} - Threshold no longer exceeded, reset")

if __name__ == "__main__":
    main()
