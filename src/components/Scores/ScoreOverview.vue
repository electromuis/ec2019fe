<template>
    <div id="overview">
        <table class="table table-striped">
            <tbody>
                <tr>
                    <td colspan="2" class="header">Song</td>
                </tr>
                <tr>
                    <td>Name</td>
                    <td>{{score.stepChart.song.title}}</td>
                </tr>
                <tr>
                    <td>Artist</td>
                    <td>{{score.stepChart.song.artist}}</td>
                </tr>
                <tr>
                    <td>Level</td>
                    <td><a @click="$router.push('/charts/' + score.stepChart._id + '/scores')" href="#">{{score.stepChart.difficultyLevel}}</a></td>
                </tr>
                <tr>
                    <td colspan="2">
                        <Density :chart="score.stepChart.stepData" />
                    </td>
                </tr>
                <tr>
                    <td>Stepartist</td>
                    <td>{{score.stepChart.stepArtist}}</td>
                </tr>
                <tr>
                    <td>Pack(s)</td>
                    <td>{{score.stepChart.groups.join(', ')}}</td>
                </tr>

                <tr>
                    <td colspan="2" class="header">Score</td>
                </tr>
                <tr>
                    <td>Percentage</td>
                    <td>{{(Math.round(score.scoreValue * 10000) / 100).toFixed(2)}} %</td>
                </tr>
<!--                <tr>-->
<!--                    <td>EX Points</td>-->
<!--                    <td>{{exScore()}}</td>-->
<!--                </tr>-->
                <tr>
                    <td>Seconds survided</td>
                    <td>{{moment.utc(score.secondsSurvived * 1000).format('mm:ss')}}</td>
                </tr>
                <tr>
                    <td>Passed</td>
                    <td>{{(score.passed ? 'Yes' : 'No')}}</td>
                </tr>
                <tr>
                    <td>Player</td>
                    <td><a @click="$router.push('/players/' + score.player._id + '/details')" href="#">{{score.player.nickname}}</a></td>
                </tr>

                <tr>
                    <td colspan="2" class="header">Breakdown</td>
                </tr>
                <tr v-for="(v, k) in score.scoreBreakdown">
                    <td>{{unCamelCase(k)}}</td>
                    <td>{{v}}</td>
                </tr>

                <tr>
                    <td colspan="2" class="header">Other</td>
                </tr>
                <tr>
                    <td>Noteskin</td>
                    <td>{{score.noteSkin}}</td>
                </tr>
                <tr>
                    <td>Cab</td>
                    <td>{{score.arcadeCab.name}}</td>
                </tr>

                <tr>
                    <td>Date</td>
                    <td>{{ moment(score.playedAt).format('DD-MM-Y HH:MM') }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
    import VueFormGenerator from "vue-form-generator";
    import Density from "../Charts/Density.vue";

    export default {
        name: "ScoreOverview",

        props: {
            score: Object
        },

        methods: {
            exScore() {
                let points = 0

                points += this.score.scoreBreakdown.fantastics * 3
                points += this.score.scoreBreakdown.excellents * 2
                points += this.score.scoreBreakdown.greats * 1

                return points
            },

            unCamelCase (str){
                str = str
                // insert a space between lower & upper
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    // space before last upper in a sequence followed by lower
                    .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
                    // uppercase the first character
                    .replace(/^./, function(str){ return str.toUpperCase(); })

                str = str.charAt(0).toUpperCase() + str.slice(1)

                return str
            }
        },

        components: {
            "vue-form-generator": VueFormGenerator.component,
            Density: Density
        }
    }
</script>

<style>
    .header {
        text-align: center;
        font-weight: bold;
    }
</style>
