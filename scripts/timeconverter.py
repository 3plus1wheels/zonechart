from datetime import datetime

def convertTo24(time):
    # Parse the time string into a datetime object
    t = datetime.strptime(time, '%I:%M %p')
    # Format the datetime object into a 24-hour time string
    return t.strftime('%H:%M')

def convertTo12(time):
    # Parse the time string into a datetime object
    t = datetime.strptime(time, '%H:%M')
    # Format the datetime object into a 12-hour time string
    return t.strftime('%I:%M %p')

def noAMPM(time):
    # Parse the time string into a datetime object
    t = datetime.strptime(time, '%I:%M %p')
    return t.strftime('%I:%M')