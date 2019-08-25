echo "Setting datarate to $2kbps on $1"

/sbin/tc qdisc add dev $1 root handle 1: htb
/sbin/tc class add dev $1 parent 1: classid 1:1 htb rate $2kbps
/sbin/tc class add dev $1 parent 1:1 classid 1:5 htb rate $2kbps ceil $2kbps prio 1
/sbin/tc class add dev $1 parent 1:1 classid 1:6 htb rate $2kbps ceil $2kbps prio 0
/sbin/tc filter add dev $1 parent 1:0 prio 1 protocol ip handle 5 fw flowid 1:5
/sbin/tc filter add dev $1 parent 1:0 prio 0 protocol ip handle 6 fw flowid 1:6
/sbin/iptables -A OUTPUT -t mangle -p tcp --sport 46659 -j MARK --set-mark 5
/sbin/iptables -A OUTPUT -t mangle -p tcp --sport 46660 -j MARK --set-mark 6
