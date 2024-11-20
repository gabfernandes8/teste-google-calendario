require('dotenv').config()
const express = require('express')
const { google } = require('googleapis')
const { calendar } = require('googleapis/build/src/apis/calendar')

const app = express()
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT
)

app.get('/', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/calendar.readonly'
    })

    res.redirect(url)
})

app.get('/redirect', (req, res) => {
    const code = req.query.code
    oauth2Client.getToken(code, (err, tokens) => {
        if (err) {
            console.error('couldnt get token', err)
            res.send('Error')

            return
        }

        oauth2Client.setCredentials(tokens)
        res.send('Successfully logged in')
    })
})

app.get('/calendars', (req, res) => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    calendar.calendarList.list({}, (err, response) => {
        if (err) {
            console.log('error fetching calendars', err)
            res.send('Error')

            return
        }

        const calendars = response.data.items
        res.json(calendars)
    })
})

const eventStartTime = new Date()
eventStartTime.setDate(eventStartTime.getDay() + 2)

const eventEndTime = new Date()
eventEndTime.setDate(eventEndTime.getDay() + 2)
eventEndTime.setMinutes(eventEndTime.getMinutes() + 45)

const event = {
    title: 'Fuvest',
    location: 'Av. Carlos Capriotti, 123 - Centro, Barueri - SP',
    description: '#vemmed',
    start: {
        dateTime: eventStartTime,
        timeZone: 'Brazil/Brasilia'
    },
    end: {
        dateTime: eventEndTime,
        timeZone: 'Brazil/Brasilia'
    },
    colorId: 1,
}

calendar.freebusy.query({
    resource: {
        timeMin: eventStartTime,
        timeMax: eventEndTime,
        timeZone: 'Brazil/Brasilia',
        items: [{ id: 'primary' }]
    },
}, (err, res) => {
    if (err) {
        return console.error('free busy query error: ', err)
    } else {
        const eventsArray = res.data.calendars.primary.busy

        if (eventsArray.length === 0) {
            return calendar.events.insert({ calendarId: 'primary', resource: event },
                err => {
                    if (err) {
                        return console.error('calendar event creation error: ', err)
                    } else {
                        return console.log('calendar event created');
                    }
                }
            )
        }
        console.log(eventsArray)
    }
})

    app.get('/events', (req, res) => {
        const calendarId = req.query.calendar ?? 'primary'
        const calendar = google.calendar({ version: 'v3', oauth2Client })
        calendar.events.list({
            calendarId,
            timeMin: (new Date()).toISOString(),
            maxResults: 15,
            singleEvents: true,
            orderBy: 'startTime'
        },
            (err, response) => {
                if (err) {
                    console.error('cant fetch events');
                    res.send(err)
                    return
                }

                const events = response.data.items
                res.json(events)
            })
    })

app.listen(3000, () => console.log('server running at port 3000'))