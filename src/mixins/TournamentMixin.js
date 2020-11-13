import Query from 'graphql-query-builder-v2'
import moment from 'moment'

export default {
    'STATUS_OPTIONS': [
        "New",
        "Ongoing",
        "Finished"
    ],

    'ROUND_TYPES': [
        "KotH",
        "SingleElimination",
        "DoubleElimination",
        "RoundRobin"
    ],

    'PLAY_STYLES': [
        "Single",
        "Double"
    ],

    methods: {

        $loadTournament(full) {
            let me = this
            console.log(me.$route.params)

            return new Promise((resolve, reject) => {
               this.$graph(
                   'Tournament',
                   [
                       'id',
                       'name',
                       'description',
                       'status',
                       'appIds',
                       'startDate',
                       'endDate',
                       {'tournamentAdmin': [{player: ['id']}]},
                       {'tournamentManagers': [{player: ['id']}]},
                       {'arcadeCabs': ['id']},

                       {'playerJoinRequests': ['id']},
                       {'players': ['id']},
                       {'disqualifiedPlayers': ['id']},
                   ],
                   {'id': me.$route.params.tournamentId}
               ).then((tournament) => {
                   tournament.endDate = moment(tournament.endDate).calendar()
                   tournament.startDate = moment(tournament.startDate).calendar()

                   tournament.tournamentAdmin = tournament.tournamentAdmin.player.id
                   tournament.tournamentManagers = tournament.tournamentManagers.map(u => u.player.id)

                   tournament.arcadeCabs = tournament.arcadeCabs.map(u => u.id)

                   tournament.players = tournament.players.map(p => p.id)
                   tournament.disqualifiedPlayers = tournament.disqualifiedPlayers.map(p => p.id)
                   tournament.playerJoinRequests = tournament.playerJoinRequests.map(p => p.id)

                   me.tournament = tournament
                   resolve(tournament)
               }).catch((e) => {
                   reject(e)
                   me.$router.push('/tournaments')
               })
           })
        },

        $loadEvent() {
            let me = this

            return new Promise((resolve, reject) => {
                this.$graph(
                    'TournamentEvent',
                    [
                        'id',
                        'name',
                        'status',
                        'isCountedToTournamentPoints',
                        {'players': ['id']},
                        {'disqualifiedPlayers': ['id']},
                    ],
                    {'id': me.$route.params.eventId}
                ).then(event => {
                    event.players = event.players.map(u => u.id)
                    event.disqualifiedPlayers = event.disqualifiedPlayers.map(u => u.id)

                    me.event = event
                    resolve(event)
                }).catch((e) => {
                    reject(e)
                    me.$router.push('/tournaments')
                })
            })
        },

        $loadPart() {
            let me = this

            return new Promise(((resolve, reject) => {
                this.$graph(
                    'TournamentEventPart',
                    [
                        "id",
                        "name",
                        "roundType",
                        "status",
                        {'stepCharts': ['id']},
                        {'arcadeCabs': ['id']}
                    ],
                    {'id': me.$route.params.partId}
                ).then((part) => {
                    part.arcadeCabs = part.arcadeCabs.map(u => u.id)
                    part.stepCharts = part.stepCharts.filter(u => u !== null)
                    part.stepCharts = part.stepCharts.map(u => u.id)

                    me.part = part
                    resolve(part)
                }).catch((e) => {
                    console.log("ERRRRRRRRRRRRRRRRRR" + e)
                    reject(e)
                    me.$router.push('/tournaments')
                })
            }))
        },

        $loadRound() {
            let me = this

            return new Promise(((resolve, reject) => {
                this.$graph(
                    'Round',
                    [
                        "id",
                        "name",
                        "roundType",
                        "playMode",
                        "bestOfCount",
                        "status",
                        {'arcadeCabs': ['id']}
                    ],
                    {'id': me.$route.params.roundId}
                ).then((round) => {
                    round.arcadeCabs = round.arcadeCabs.map(u => u.id)

                    me.round = round
                    resolve(round)
                }).catch((e) => {
                    reject(e)
                    me.$router.push('/tournaments')
                })
            }))
        },

        async genElimination() {
            let me = this
            if(this.part.roundType !== 'SingleElimination' && this.part.roundType !== 'DoubleElimination') {
                return false
            }

            let cabs = await this.$getCabValues(true)
            let event = await this.$graph(
                'TournamentEvent',
                [{players: ['id']}],
                {id: me.event.id}
            )

            let players = event.players.map(p => p.id)
            let numPlayers = players.length
            let numPlayersRoundOne = 1 << 31 - Math.clz32(numPlayers);
            let numMatchesPre = numPlayers - numPlayersRoundOne
            let losers = this.part.roundType === 'DoubleElimination'
            let bestOff = 1
            let rounds = {Winners: [], Losers: []}
            let roundCounter = 0
            let playerCounter = 0

            if(numMatchesPre > 0) {
                let round = await me.$api.post(
                    '/api/rounds',
                    {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        tournamentEventPartId: me.part.id,
                        roundType: me.part.roundType,
                        playMode: "Single",
                        name: "Winners " + roundCounter,
                        status: "New",
                        bestOfCount: bestOff,
                        arcadeCabs: cabs
                    },
                    {expectStatus: 201}
                )
                rounds['Winners'][roundCounter] = round

                let matches = []
                while(matches.length < numMatchesPre) {
                    let match = await me.$api.post(
                        '/api/matches',
                        {
                            token: localStorage.token,
                            tournamentId: me.tournament.id,
                            roundId: round.id,
                            status: "New",
                            roundType: me.part.roundType,
                            playMode: "Single",
                            bestOfCount: bestOff,
                            arcadeCabs: [],
                            dependantMatches: [],
                            players: [
                                players[playerCounter],
                                players[playerCounter+1]
                            ]
                        },
                        {expectStatus: 201}
                    )
                    playerCounter += 2
                    matches.push(match)
                }
                round.matches = matches
            }

            let numMatches = numPlayersRoundOne

            while (1 === 1) {
                numMatches = numMatches / 2
                roundCounter ++

                let round = await me.$api.post(
                    '/api/rounds',
                    {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        tournamentEventPartId: me.part.id,
                        roundType: me.part.roundType,
                        playMode: "Single",
                        name: "Winners " + roundCounter,
                        status: "New",
                        bestOfCount: bestOff,
                        arcadeCabs: cabs
                    },
                    {expectStatus: 201}
                )
                rounds['Winners'][roundCounter] = round


                let matches = []
                while(matches.length < numMatches) {
                    let matchData = {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        roundId: round.id,
                        status: "New",
                        roundType: me.part.roundType,
                        playMode: "Single",
                        bestOfCount: bestOff,
                        arcadeCabs: [],
                        dependantMatches: [],
                        players: []
                    }

                    if(roundCounter === 1) {
                        if (numMatchesPre > 0 && matches.length < numMatchesPre) {
                            matchData.players.push(players[playerCounter])
                            matchData.dependantMatches.push(rounds.Winners[0].matches[matches.length].id)
                            playerCounter++
                        } else {
                            if(playerCounter > (players.length - 2)) {
                                playerCounter = 0
                            }

                            console.log(players, playerCounter)
                            matchData.players.push(players[playerCounter])
                            matchData.players.push(players[playerCounter + 1])
                            playerCounter += 2
                        }
                    } else {
                        let matchCounter = 0
                        if(matches.length > 0) {
                            matchCounter = matches.length * 2
                        }

                        console.log([
                            matchCounter,
                            matches.length,
                            roundCounter,
                            rounds,
                            rounds['Winners'][roundCounter - 1].matches
                        ])

                        matchData.dependantMatches.push(rounds['Winners'][roundCounter - 1].matches[matchCounter].id)
                        matchData.dependantMatches.push(rounds['Winners'][roundCounter - 1].matches[matchCounter + 1].id)
                    }

                    let match = await me.$api.post(
                        '/api/matches',
                        matchData,
                        {expectStatus: 201}
                    )
                    matches.push(match)
                }

                round.matches = matches

                matches = []

                //Create losers pre
                if(roundCounter === 1 && numMatchesPre > 0) {
                    round = await me.$api.post(
                        '/api/rounds',
                        {
                            token: localStorage.token,
                            tournamentId: me.tournament.id,
                            tournamentEventPartId: me.part.id,
                            roundType: me.part.roundType,
                            playMode: "Single",
                            name: "Losers 0",
                            status: "New",
                            bestOfCount: bestOff,
                            arcadeCabs: cabs
                        },
                        {expectStatus: 201}
                    )
                    rounds['Losers'][0] = round

                    while (matches.length < numMatchesPre) {

                        let matchData = {
                            token: localStorage.token,
                            tournamentId: me.tournament.id,
                            roundId: round.id,
                            status: "New",
                            roundType: me.part.roundType,
                            playMode: "Single",
                            bestOfCount: bestOff,
                            arcadeCabs: [],
                            dependantMatches: [
                                rounds.Winners[0].matches[matches.length].id,
                                rounds.Winners[1].matches[matches.length + 1].id,
                            ],
                            players: []
                        }

                        playerCounter += 2

                        let match = await me.$api.post(
                            '/api/matches',
                            matchData,
                            {expectStatus: 201}
                        )
                        matches.push(match)
                    }
                }

                //Create a Losers round
                round = await me.$api.post(
                    '/api/rounds',
                    {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        tournamentEventPartId: me.part.id,
                        roundType: me.part.roundType,
                        playMode: "Single",
                        name: "Losers " + roundCounter,
                        status: "New",
                        bestOfCount: bestOff,
                        arcadeCabs: cabs
                    },
                    {expectStatus: 201}
                )
                rounds['Losers'][roundCounter] = round

                matches = []

                while (matches.length < numMatches) {
                    // console.log([roundCounter, matchCounter, numMatches, numPlayersRoundOne, matches, rounds])

                    let matchData = {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        roundId: round.id,
                        status: "New",
                        roundType: me.part.roundType,
                        playMode: "Single",
                        bestOfCount: bestOff,
                        arcadeCabs: [],
                        dependantMatches: [
                            rounds.Winners[roundCounter].matches[matches.length].id
                        ],
                        players: []
                    }

                    if(roundCounter > 1) {
                        matchData.dependantMatches.push(rounds.Winners[roundCounter - 1].matches[matches.length].id)
                    }

                    playerCounter += 2

                    let match = await me.$api.post(
                        '/api/matches',
                        matchData,
                        {expectStatus: 201}
                    )
                    matches.push(match)
                }

                if(matches.length === 1) {
                    break
                }
            }
        },

        async $generateStructure() {
            let me = this

            let cabs = await this.$getCabValues(true)

            if(this.part.roundType === 'SingleElimination' || this.part.roundType === 'DoubleElimination') {
                let result = await this.$graph(
                    'TournamentEvent',
                    [{players: ['id']}],
                    {id: me.event.id}
                )

                if(result.players.length === 0 || (result.players.length & (result.players.length - 1)) !== 0) {
                    return "Invalid amount of players";
                }

                let players = result.players
                let playersLeft = players.length
                let lastLoserMatches = []
                let lastWinnerMatches = []

                let bestOff = 1
                let roundNumber = 1



                while(playersLeft > 1) {
                    let roundBase = {
                        token: localStorage.token,
                        tournamentId: me.tournament.id,
                        tournamentEventPartId: me.part.id,
                        roundType: me.part.roundType,
                        playMode: "Single",
                        name: "Round " + roundNumber,
                        status: "New",
                        bestOfCount: bestOff,
                        arcadeCabs: cabs
                    }

                    if(roundNumber === 1) {
                        roundBase.players = players
                    }

                    let round = await me.$api.post('/api/rounds', roundBase, {expectStatus: 201})
                    let matches = playersLeft / 2
                    let lastWinnerMatchesBuffer = []

                    while(matches > 0) {
                        let row = {
                            token: localStorage.token,
                            tournamentId: me.tournament.id,
                            roundId: round.id,
                            status: "New",
                            roundType: me.part.roundType,
                            playMode: "Single",
                            bestOfCount: bestOff,
                            arcadeCabs: [],
                            dependantMatches: []
                        }

                        if (roundNumber === 1) {
                            let playerOffset = lastWinnerMatchesBuffer.length*2
                            row.players = [
                                players[playerOffset],
                                players[playerOffset + 1]
                            ]
                        } else {
                            let matchOffset = lastWinnerMatchesBuffer.length*2
                            row.dependantMatches.push(lastWinnerMatches[matchOffset].id)
                            row.dependantMatches.push(lastWinnerMatches[matchOffset + 1].id)

                        }

                        let match = await me.$api.post('/api/matches', row, {expectStatus: 201})
                        lastWinnerMatchesBuffer.push(match)

                        matches --
                    }

                    lastWinnerMatches = lastWinnerMatchesBuffer

                    if(this.part.roundType === 'DoubleElimination') {
                        let roundBase = {
                            token: localStorage.token,
                            tournamentId: me.tournament.id,
                            tournamentEventPartId: me.part.id,
                            roundType: me.part.roundType,
                            playMode: "Single",
                            name: "Losers " + roundNumber,
                            status: "New",
                            bestOfCount: bestOff,
                            arcadeCabs: cabs
                        }

                        let round = await me.$api.post('/api/rounds', roundBase, {expectStatus: 201})

                        let losers = lastWinnerMatches.length / 2 + lastLoserMatches / 2
                        lastLoserMatches = []

                        while(losers > 0) {
                            let row = {
                                token: localStorage.token,
                                tournamentId: me.tournament.id,
                                roundId: round.id,
                                status: "New",
                                roundType: me.part.roundType,
                                playMode: "Single",
                                bestOfCount: bestOff,
                                arcadeCabs: [],
                            }

                            let match = await me.$api.post('/api/matches', row, {expectStatus: 201})
                            lastLoserMatches.push(match)

                            losers --
                        }
                    }

                    roundNumber ++
                    playersLeft = playersLeft / 2
                }

                if(this.part.roundType === 'DoubleElimination') {

                }
            }

            return true
        },

        $getCabValues(forTournament) {
            let me = this

            return new Promise(((resolve, reject) => {
                if(forTournament === true) {
                    this.$graph(
                        'Tournament',
                        [
                            {'arcadeCabs': ['id', 'name', 'cabLocation']}
                        ],
                        {'id': me.$route.params.tournamentId}
                    ).then((tournament) => {
                        let mapped = tournament.arcadeCabs.map((c) => {
                            return {
                                id: c.id,
                                name: c.cabLocation + ' - ' + c.name
                            }
                        })
                        resolve(mapped)
                    }).catch(reject)
                } else {
                    me.$graph(
                        "ArcadeCabs",
                        {nodes: ['id', 'name', 'cabLocation']}
                    ).then((cabs) => {
                        let mapped = cabs.nodes.map((c) => {
                            return {
                                id: c.id,
                                name: c.name
                            }
                        })
                        resolve(mapped)
                    }).catch(reject)
                }
            }))
        },

        async $getPlayer(id) {
            let me = this

            return new Promise((resolve, reject) => {
                me.$getPlayers().then(players => {
                    if(Array.isArray(players) === false) {
                        console.log(["No players", players])
                    }

                    console.log(players)
                    let filter = players.filter(p => p.id === id)
                    if(filter.length === 1) {
                        resolve(filter[0])
                    } else {
                        reject()
                    }
                })
            })
        },

        async $getPlayers() {
            let me = this

            return new Promise((resolve, reject) => {
                // console.log(me.$store.state.players.length)

                // if(me.$store.state.players.length === 0) {
                    me.$graph(
                        'Players',
                        {nodes: [
                            'id',
                            'nickname',
                            // 'shortNickname',
                            {country: ['id']},
                            //And the other fields
                        ]}
                    ).then(players => {
                        // me.$store.commit('SET', {
                        //     key: 'players',
                        //     value: mapped
                        // })

                        let mapped = players.nodes.map((c) => {
                            return {
                                id: c.id,
                                name: c.nickname
                            }
                        })

                        resolve(mapped)
                    })
                    .catch(reject)
                // } else {
                //     let mapped = me.$store.state.players
                //
                //     if(form === true) {
                //         mapped = mapped.map(p => ({name: p.nickname, id: p.id}))
                //     }
                //
                //     resolve(mapped)
                // }
            })
        }
    },

    computed: {
        $tournamentPath() {
            return '/tournaments/' + this.$route.params.tournamentId
        },

        $eventPath() {
            return '/tournaments/' + this.$route.params.tournamentId + '/events/' + this.$route.params.eventId
        },

        $partPath() {
            return '/tournaments/' + this.$route.params.tournamentId + '/events/' + this.$route.params.eventId + '/parts/' + this.$route.params.partId
        }
    }
}