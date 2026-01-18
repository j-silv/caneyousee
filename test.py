from indistinguishable_from_magic import magic as Magic
import time
import keyboard
# 70B8F665C60C

if __name__ == "__main__":
    with Magic.Hardware("/dev/cu.SLAB_USBtoUART") as d:
        d.connect()


        state = 1

        curr = time.time()

        count = 0
        state = 0
        while True:
            try:
                count += 1 
                data = d.read()
                #print(d)
                #print(d.mesh)
                # 
                # print(d.mesh["70B8F665C60C"].modules[4].data.milimeters if "70B8F665C60C" in d.mesh and d.mesh["70B8F665C60C"].modules[4] is not None else "empty?")
                if "70B8F665C60C" in d.mesh:
                    print(d.mesh["70B8F665C60C"].modules[4].data.milimeters)

                    state = not state

                    d.mesh["70B8F665C60C"].modules[0].out.setState(state)
                    time.sleep(1) 
                    # d.mesh["70B8F665C60C"].modules[7].out.setState(state)
                    

                    # d.send(f"4,6,1,70B8F665C60C,3,1,26,{state}")
                    # d.send(f"4,6,1,70B8F665C60C,3,8,26,{state}")
                    # if count % 50 == 0:
                    #  4,6,1,70B8F665C60C,3,1,26,1 -> turn 0 module ON
                    #  4,6,1,70B8F665C60C,3,1,26,0 -> turn 0 module OFF   
                    #  4,6,1,70B8F665C60C,3,8,26,1 -> turn 7 module ON
                    #  4,6,1,70B8F665C60C,3,8,26,0 -> turn 7 module OFF   

                    #     print("count % 50")

                    # else:
                    #     d.mesh["70B8F665C60C"].modules[0].out.setState(1) 
                    #     d.mesh["70B8F665C60C"].modules[7].out.setState(1) 


                # if time.time() - curr > 3:
                #     curr = time.time()
                #     state = 0 if state == 1 else 1
                #     print("state", state)

                        

            except KeyboardInterrupt:
                d.disconnect()
                exit()