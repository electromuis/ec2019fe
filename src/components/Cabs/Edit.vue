<template>
    <loading v-if="loading" :active="true"></loading>
    <div v-else id="edit">
        <h1>Cab</h1>
        <br/>

        <b-alert v-if="message" show variant="secondary">{{message}}</b-alert>
        <vue-form-generator :schema="schema" :model="cab" :options="formOptions" @validated="handleValidation" />
        <b-button v-if="valid" v-on:click="handleClick" variant="primary">Save</b-button>
        <b-button v-else v-on:click="handleClick" disabled>Save</b-button>
    </div>
</template>

<script>
    import VueFormGenerator from "vue-form-generator";
    import Loading from 'vue-loading-overlay';

    export default {
        methods: {
            makeid() {
                let text = "";
                let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

                for (let i = 0; i < 32; i++)
                    text += possible.charAt(Math.floor(Math.random() * possible.length));

                return text;
            },


            handleClick(e) {
                let me = this
                let data = this.cab

                data.token = localStorage.token
                data.cabOwner = me.$user.data.userId
                delete data._id

                if(me.loading === false) {
                    if(this.$route.params.cabId.length > 1) {
                        let url = '/api/arcade-cabs/' + this.$route.params.cabId
                        if(me.$user.isAdmin() === false) {
                            url += '/edit'
                        }

                        me.$api.put(url, data, {expectStatus: 201}).then(() => {
                            me.$router.push('/cabs')
                        })
                    } else {
                        let url = '/api/arcade-cabs'
                        if(me.$user.isAdmin() === false) {
                            url += '/create'
                        } else {
                            data.apiKey = me.makeid()
                        }

                        me.$api.post(url, data, {expectStatus: 201}).then(() => {
                            me.$router.push('/cabs')
                        })
                    }
                }
            },
            handleValidation(valid, errors) {
                this.valid = valid
            }
        },

        created() {
            let me = this

            if(me.$user.isAdmin()) {
                this.$api.get('/api/users?sort=email&token=' + localStorage.token)
                .then((users) => {
                    let mappedUsers = users.map(u => {
                        return {
                            name: u.email,
                            id: u.id
                        }
                    })

                    me.schema.fields.filter(x => x.model === 'cabOwner')[0].values = mappedUsers
                    me.schema.fields.filter(x => x.model === 'coOwners')[0].items.values = mappedUsers
                })
            }

            if(this.$route.params.cabId.length > 1) {
                me.schema.fields = me.schema.fields.filter(x => x.model !== 'apiKey')

                me.$graph(
                    'ArcadeCab',
                    [
                        '_id',
                        'name',
                        'cabDescription',
                        'cabIconUrl',
                        'cabLocation',
                        {'cabOwner': ['_id']},
                        {'coOwners': ['_id']},
                        'isLeftSidePlayable',
                        'isRightSidePlayable'
                    ],
                    {id: me.$route.params.cabId}
                ).then((cab) => {
                    cab.cabOwner = cab.cabOwner._id
                    cab.coOwners = cab.coOwners.map(u => u._id)

                    me.cab = cab
                    console.log(me.cab)
                    me.loading = false
                }).catch(() => {
                    me.$router.push('/cabs')
                })
            }
            else {
                me.loading = false
            }
        },

        data () {
            return {
                valid: false,
                success: false,
                loading: true,
                message: "",
                cab: {
                    _id: 0,
                    name: "",
                    cabDescription: "",
                    cabLocation: "",
                    cabIconUrl: "",
                    cabOwner: "",
                    coOwners: [],
                    isLeftSidePlayable: true,
                    isRightSidePlayable: true
                },
                schema: {
                    fields: [
                        {
                            type: "input",
                            inputType: "text",
                            label: "Name",
                            model: "name",
                            required: "true",
                            validator: VueFormGenerator.validators.string
                        },
                        {
                            type: "input",
                            inputType: "text",
                            label: "Description",
                            model: "cabDescription"
                        },
                        // {
                        //     type: "input",
                        //     inputType: "text",
                        //     label: "Location",
                        //     model: "cabLocation"
                        // },
                        {
                            type: "input",
                            inputType: "text",
                            label: "Icon url",
                            model: "cabIconUrl"
                        },
                        // {
                        //     type: "select",
                        //     label: "Cab owner",
                        //     model: "cabOwner",
                        //     require: "true",
                        //     values: [],
                        //     validator: VueFormGenerator.validators.string
                        // },
                        // {
                        //     type: "array",
                        //     label: "Co owners",
                        //     model: "coOwners",
                        //     newElementButtonLabelClasses: "btn btn-secondary new",
                        //     removeElementButtonClasses: "btn btn-secondary remove",
                        //     itemContainerClasses: "array-item",
                        //     showRemoveButton: true,
                        //     items: {
                        //         type: "select",
                        //         values: []
                        //     }
                        // },
                        {
                            type: "select",
                            label: "Has P1",
                            model: "isLeftSidePlayable",
                            require: "true",
                            values: [true, false],
                            validator: VueFormGenerator.validators.boolean
                        },
                        {
                            type: "select",
                            label: "Has P2",
                            model: "isRightSidePlayable",
                            require: "true",
                            values: [true, false],
                            validator: VueFormGenerator.validators.boolean
                        }
                    ]
                },
                formOptions: {
                    validateAfterLoad: true,
                    validateAfterChanged: true,
                    validateAsync: true
                }
            }
        },

        components: {
            "vue-form-generator": VueFormGenerator.component,
            "loading": Loading
        }
    }
</script>

<style>
    .array-item {
        margin-bottom: 12px;
    }
    .btn.remove {
        margin-left: 12px;
    }
    .array-item {
        display: flex;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
    }
</style>