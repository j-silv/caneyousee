from indistinguishable_from_magic import magic as Magic

if __name__ == "__main__":
    with Magic.Hardware("/dev/cu.SLAB_USBtoUART") as d:
        d.connect()
        while True:
            try:
                data = d.read()
                print(data.modules[2].rawData)

            except KeyboardInterrupt:
                d.disconnect()
                exit()