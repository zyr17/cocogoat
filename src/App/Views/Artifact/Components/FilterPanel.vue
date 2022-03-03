<script lang="ts">
import { defineComponent, PropType } from 'vue'
import {
    ArtifactParamTypes,
    ArtifactSubParamTypes,
    ArtifactPositionNames,
    ArtifactSetNames,
} from '@/typings/ArtifactMap'
import { SubFilterEquation, SubFilter, ArtifactFilter } from '@/typings/ArtifactFilter'
import { clipboard } from 'electron';
import { ElNotification } from 'element-plus'
import { __ } from '@/i18n'
export default defineComponent({
    props: {
        inputFilter: {
            type: Object as PropType<ArtifactFilter>,
        },
        show: Boolean,
        title: String,
    },
    emits: ['update:filter', 'update:show'],
    data() {
        let availableSubFilterEquations: any[] = []
        for (let i in SubFilterEquation)
            if (isNaN(Number(i))) availableSubFilterEquations.push({ value: SubFilterEquation[i], label: i })
        const filter = this.inputFilter || new ArtifactFilter()
        let showLoadPanel = false;
        let saveInput = '';
        return {
            ArtifactParamTypes,
            ArtifactSubParamTypes,
            ArtifactSetNames,
            ArtifactPositionNames,
            availableSubFilterEquations,
            filter,
            showLoadPanel,
            saveInput,
        }
    },
    watch: {},
    created() {},
    methods: {
        doSave() {
            this.$emit('update:filter', this.filter)
            this.$emit('update:show', false)
        },
        doAddIncludeSub() {
            this.filter.includeSub.push(new SubFilter())
        },
        doAddExcludeSub() {
            this.filter.excludeSub.push(new SubFilter())
        },
        doDeleteIncludeSub(key: number) {
            this.filter.includeSub.splice(key, 1)
        },
        doDeleteExcludeSub(key: number) {
            this.filter.excludeSub.splice(key, 1)
        },
        onSubClick(sub: SubFilter) {
            if (sub.name === '元素精通' && sub.value.indexOf('%') > -1) sub.value = sub.value.replace('%', '')
            if (
                ['暴击率', '暴击伤害', '元素充能效率'].indexOf(sub.name.toString()) > -1 &&
                sub.value.indexOf('%') === -1
            )
                sub.value += '%'
        },
        showJSON() {
            clipboard.writeText(JSON.stringify(this.filter));
            ElNotification({
                type: 'success',
                title: __('导出过滤规则成功'),
                message: __('已复制到剪贴板'),
            })
        },
        loadJSON() {
            try {
                this.filter = JSON.parse(this.saveInput);
                ElNotification({
                    type: 'success',
                    title: __('导入过滤规则成功'),
                })
            }
            catch {
                ElNotification({
                    type: 'error',
                    title: __('导入过滤规则失败'),
                    message: __('请检查规则是否为合法JSON格式'),
                })
            }
        }
    },
})
</script>
<template>
    <el-dialog :title="title" width="800px" :model-value="show" @update:model-value="$emit('update:show', $event)">
        <article class="artiface-edit-panel">
            <el-select v-model="filter.position" multiple :placeholder="__('位置')">
                <el-option v-for="(item, a) in ArtifactPositionNames" :key="a" :label="__(item)" :value="item">
                </el-option>
            </el-select>
            <el-select v-model="filter.set" multiple :placeholder="__('套装')">
                <el-option v-for="(item, a) in ArtifactSetNames" :key="a" :label="__(item)" :value="item"> </el-option>
            </el-select>
            <el-select v-model="filter.level" multiple :placeholder="__('等级')">
                <el-option
                    v-for="(item, a) in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]"
                    :key="a"
                    :label="item"
                    :value="item"
                >
                </el-option>
            </el-select>
            <el-select v-model="filter.stars" multiple :placeholder="__('星级')">
                <el-option v-for="(item, a) in [1, 2, 3, 4, 5]" :key="a" :label="item" :value="item"> </el-option>
            </el-select>
            <el-select v-model="filter.main" multiple :placeholder="__('主词条')">
                <el-option v-for="(item, a) in ArtifactParamTypes" :key="a" :label="__(item)" :value="item">
                </el-option>
            </el-select>
            <br />
            {{ __('需要包含的副词条') }}<br />
            {{ __('最少包含条数') }}<br />
            <el-select v-model="filter.includeSubCount">
                <el-option v-for="(item, a) in [0, 1, 2, 3, 4]" :key="a" :label="item" :value="item"> </el-option>
            </el-select>
            <el-tooltip class="item" effect="dark" :content="__('提示：过滤生命、防御、攻击时，根据过滤值是否带百分号来决定对固定值还是百分比生效。详见过滤逻辑。')" placement="top">
                <el-empty v-if="filter.includeSub.length <= 0" :image-size="80" :description="__('暂无副词条')"></el-empty>
                <ul v-else class="sub">
                    <li v-for="(i, a) in filter.includeSub" :key="a">
                        <el-input v-model="i.value" size="small" :placeholder="__('属性值')">
                            <template #prepend>
                                <el-select v-model="i.name" size="small" :placeholder="__('属性名')">
                                    <el-option
                                        v-for="(j, a) in ArtifactSubParamTypes"
                                        :key="a"
                                        :value="j"
                                        :label="__(j)"
                                        @click="onSubClick(i)"
                                    ></el-option>
                                </el-select>
                                <el-select v-model="i.equation" size="small" style="margin-left: 0px;">
                                    <el-option
                                        v-for="(j, a) in availableSubFilterEquations"
                                        :key="a"
                                        :value="j.value"
                                        :label="j.label"
                                    ></el-option>
                                </el-select>
                            </template>
                            <template #append>
                                <el-button icon="el-icon-delete-solid" @click="doDeleteIncludeSub(a)"></el-button>
                            </template>
                        </el-input>
                    </li>
                </ul>
            </el-tooltip>
            {{ __('不想包含的副词条') }}<br />
            {{ __('最多包含条数') }}<br />
            <el-select v-model="filter.excludeSubCount">
                <el-option v-for="item in [0, 1, 2, 3, 4]" :key="item" :label="item" :value="item"> </el-option>
            </el-select>
            <el-tooltip class="item" effect="dark" :content="__('提示：过滤生命、防御、攻击时，根据过滤值是否带百分号来决定对固定值还是百分比生效。详见过滤逻辑。')" placement="top">
                <el-empty v-if="filter.excludeSub.length <= 0" :image-size="80" :description="__('暂无副词条')"></el-empty>
                <ul v-else class="sub">
                    <li v-for="(i, a) in filter.excludeSub" :key="a">
                        <el-input v-model="i.value" size="small" :placeholder="__('属性值')">
                            <template #prepend>
                                <el-select v-model="i.name" size="small" :placeholder="__('属性名')">
                                    <el-option
                                        v-for="(j, a) in ArtifactSubParamTypes"
                                        :key="a"
                                        :value="j"
                                        :label="__(j)"
                                        @click="onSubClick(i)"
                                    ></el-option>
                                </el-select>
                                <el-select v-model="i.equation" size="small" style="margin-left: 0px;">
                                    <el-option
                                        v-for="(j, a) in availableSubFilterEquations"
                                        :key="a"
                                        :value="j.value"
                                        :label="j.label"
                                    ></el-option>
                                </el-select>
                            </template>
                            <template #append>
                                <el-button icon="el-icon-delete-solid" @click="doDeleteExcludeSub(a)"></el-button>
                            </template>
                        </el-input>
                    </li>
                </ul>
            </el-tooltip>
        </article>
        <template #footer>
            <span class="dialog-footer">
                <el-button size="small" plain style="float: left" @click="doAddIncludeSub">
                    {{ __('添加想包含副词条') }}
                </el-button>
                <el-button size="small" plain style="float: left" @click="doAddExcludeSub">
                    {{ __('添加不包含副词条') }}
                </el-button>
                <el-popover
                placement="top-end"
                width="600"
                trigger="hover">
                    <div id="filter-hint" style="width: 600px;">
                        <p>{{ __('部位、套装、等级、星级、主词条为复选菜单，不选时不使用该数据过滤，选择后过滤满足所选项的圣遗物。') }}</p>
                        <p>{{ __('对于副词条，有想包含的副词条和不想包含的副词条两种。如果留空则不用于过滤。以想包含的副词条为例：') }}</p>
                        <ul>
                            <li>{{ __('最少包含条数：最少包含多少条所列的副词条。例如选择了攻充爆爆最少条数3，那么这四条中至少包含三条的圣遗物才会被过滤出来') }}</li>
                            <li>{{ __('添加想包含副词条：按钮位于窗口最下方，点击后添加新的一个副词条筛选数据') }}</li>
                            <li>{{ __('副词条：包含四部分，副词条名称、判断方式、数值、删除。名称选择副词条名，判断方式有') }}<code>&gt; &lt; =</code>{{ __('等，数值为数值阈值，删除为删除该副词条。') }}<strong>{{ __('这里名称中的攻击力、防御力、生命值同时指代百分比数据和数字数据，并通过数值栏有无百分号区分。') }}</strong>{{ __('例如只想选攻击力百分比，数值需要输入') }}<code>x%</code>{{ __('；想同时包含防御力和防御力百分比，需要写两条') }}<code>{{ __('防御力') }} &gt; 0, {{ __('防御力') }} &gt; 0%</code></li>
                        </ul>
                        <p>{{ __('不想包含的副词条和上述类似，不同在于：最多包含条数，圣遗物副词条最多只能包含多少条不想包含的副词条。添加不包含副词条，添加新的一条不想包含的副词条。') }}</p>
                        <p>{{ __('点击确定应用过滤，界面将只展示过滤出的圣遗物，同时过滤按钮变为取消过滤，点击后重新展示所有圣遗物。') }}</p>
                    </div>

                    <template #reference>
                        <el-button
                        size="small"
                        plain
                        >
                            {{ __('过滤逻辑') }}
                        </el-button>
                    </template>
                </el-popover>
                <el-button size="small" type="primary" @click="showJSON">{{ __('保存规则') }}</el-button>
                <el-button size="small" type="primary" @click="showLoadPanel = true;">{{ __('读取规则') }}</el-button>
                <el-button size="small" type="primary" @click="doSave">{{ __('确定') }}</el-button>
            </span>
        </template>
        <el-dialog class="inputsavedialog" :title="__('输入保存数据')" width="400px" :model-value="showLoadPanel" @update:model-value="showLoadPanel = false;">
            <textarea v-model="saveInput" style="width: 100%; height: 100px;"></textarea>
            <template #footer>
                <span class="dialog-footer">
                    <el-button size="small" type="primary" @click="showLoadPanel = false; loadJSON();">{{ __('确定') }}</el-button>
                    <el-button size="small" @click="showLoadPanel = false;">{{ __('取消') }}</el-button>
                </span>
            </template>
        </el-dialog>
    </el-dialog>
</template>

<style lang="scss" scoped>
.artiface-edit-panel {
    position: relative;
    margin-top: -20px;
    &::v-deep(.el-select) .el-input {
        width: 150px;
    }
    .title-select {
        width: 180px;
        white-space: nowrap;
    }
    .image {
        position: absolute;
        top: -10px;
        right: 30px;
        width: 120px;
        height: 120px;
        background: transparent no-repeat center;
        background-size: contain;
    }
    .stars {
        position: absolute;
        top: 105px;
        right: 27px;
        z-index: 2;
    }
    .sub {
        min-height: 128px;
        margin-bottom: 0;
    }
    .el-empty {
        padding: 0;
        height: 128px;
        margin-top: 14px;
    }
    .title ::v-deep(.el-select) .el-input {
        width: 180px !important;
    }

    .level ::v-deep(.el-input-number) {
        width: 180px;
    }

    .main ::v-deep(.el-input) {
        width: 180px !important;
        display: block;
    }
}
#filter-hint code {
    background-color: rgba(175, 184, 193, 0.2);
    padding: .2em .4em;
    font-size: 85%;
    margin: 0;
    border-radius: 6px;
}
</style>
