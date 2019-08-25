tcpdump -i eth0 -w "$(date| cut -d" " -f1-4) interface_tcp.pcap" port 46659 or port 46660
