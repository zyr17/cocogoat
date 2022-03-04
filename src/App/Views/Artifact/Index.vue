<script lang="ts">
import Artifact from './Components/Artifact.vue'
import { Artifact as ArtifactType } from '@/typings/Artifact'
import { ArtifactFilter, ArtifactFilter as ArtifactFilterClass } from '@/typings/ArtifactFilter'
import ArtifactEditPanel from './Components/EditPanel.vue'
import ArtifactFilterPanel from './Components/FilterPanel.vue'
import {
    openArtifactView,
    showSaveDialog,
    openExternal,
    checkDwmIsCompositionEnabled,
    checkVCRedistInstalled,
} from '../../ipc'
import { ElMessageBox, ElNotification } from 'element-plus'
import { loadData, artifactClear, artifactDelete, artifactPush, bus } from '@/App/bus'
import { convertAsMona } from '../../export/Mona'
import { convertAsMingyulab } from '../../export/Mingyulab'
// @ts-ignore
import monaToGO from '@mr-quin/mona_to_go'
import { clipboard } from 'electron'
import { defineComponent } from 'vue'
import fsex from 'fs-extra'

import { __ } from '@/i18n'

class FilterBatchOne {
    comment: string = ''
    filterjson: string = ''
    lock: boolean = false
    constructor (data?: any) {
        if (!data) return;
        this.comment = data.comment;
        this.filterjson = data.filterjson;
        this.lock = data.lock;
    }
}

export default defineComponent({
    components: {
        Artifact,
        ArtifactEditPanel,
        ArtifactFilterPanel,
    },
    data() {
        return {
            showEdit: false,
            editData: this.createEmptyArtifact(),
            isEdit: false,
            selectedIds: [] as number[],
            showFilter: false,
            showFilterBatch: false,
            showLoadFilterBatchPanel: false,
            filterBatchSaveInput: '',
            filterBatch: [] as FilterBatchOne[],
            isFiltering: false,
            artifactFilter: new ArtifactFilterClass(),
        }
    },
    computed: {
        list(): ArtifactType[] {
            if (this.isFiltering) {
                let result = []
                for (const artifact of bus.artifacts) if (this.artifactFilter.filter(artifact)) result.push(artifact)
                return result
            }
            return bus.artifacts
        },
    },
    methods: {
        createEmptyArtifact() {
            return {
                id: Date.now(),
                name: '',
                stars: 0,
                lock: false,
                level: 0,
                main: {
                    name: '',
                    value: '',
                },
                sub: [],
                user: '',
            } as ArtifactType
        },
        async openArtifactView() {
            try {
                if (!(await checkVCRedistInstalled())) {
                    await ElMessageBox.confirm(
                        __(
                            '您的系统似乎没有安装微软运行库 (下载地址：https://aka.ms/vs/16/release/vc_redist.x64.exe) ，识别功能将无法正常使用。',
                        ),
                        __('提示'),
                        {
                            confirmButtonText: __('前往下载'),
                            cancelButtonText: __('仍然尝试'),
                            type: 'warning',
                        },
                    )
                    openExternal('https://aka.ms/vs/16/release/vc_redist.x64.exe')
                    return
                }
            } catch (e) {}
            try {
                if (!(await checkDwmIsCompositionEnabled())) {
                    await ElMessageBox.confirm(__('您的系统似乎没有启用Aero，识别功能可能无法正常使用。'), __('提示'), {
                        confirmButtonText: __('确认'),
                        cancelButtonText: __('仍然尝试'),
                        type: 'warning',
                    })
                    return
                }
            } catch (e) {}
            ElNotification({
                type: 'info',
                title: __('正在打开圣遗物识别工具'),
                message: __('请确保原神已经运行'),
                duration: 5000,
            })
            openArtifactView()
        },
        doDelete(id: number) {
            artifactDelete(id)
        },
        doDeleteSelected() {
            this.selectedIds.forEach((id) => {
                artifactDelete(id)
            })
            this.selectedIds = []
        },
        doCreate() {
            this.editData = this.createEmptyArtifact()
            this.showEdit = true
            this.isEdit = false
        },
        doEdit(id: number) {
            for (let i of bus.artifacts) {
                if (i.id === id) {
                    this.editData = i
                    this.showEdit = true
                    this.isEdit = true
                }
            }
        },
        doEditSave(artifact: ArtifactType) {
            artifactPush(artifact)
            this.showEdit = false
        },
        doClear() {
            artifactClear()
            this.selectedIds = []
        },
        doSelect(id: number, status: boolean) {
            if (status) {
                this.selectedIds.push(id)
            } else {
                this.selectedIds = this.selectedIds.filter((e) => e !== id)
            }
        },
        getExport(format: string) {
            let artifacts = JSON.parse(JSON.stringify(bus.artifacts))
            if (this.selectedIds.length > 0) {
                artifacts = artifacts.filter((e: ArtifactType) => this.selectedIds.includes(e.id))
            }
            switch (format) {
                case 'GO':
                    return JSON.stringify(
                        {
                            version: 0,
                            characterDatabase: {},
                            artifactDatabase: monaToGO(convertAsMona(artifacts), 0, 3),
                            artifactDisplay: {
                                filterArtSetKey: '',
                                filterStars: [3, 4, 5],
                                filterLevelLow: 0,
                                filterLevelHigh: 20,
                                filterSlotKey: '',
                                filterMainStatKey: '',
                                filterSubstats: ['', '', '', ''],
                                filterLocation: '',
                                filterLocked: '',
                                ascending: false,
                                sortType: 'quality',
                                maxNumArtifactsToDisplay: 50,
                                effFilter: [
                                    'hp',
                                    'hp_',
                                    'atk',
                                    'atk_',
                                    'def_',
                                    'def',
                                    'eleMas',
                                    'enerRech_',
                                    'critRate_',
                                    'critDMG_',
                                ],
                            },
                            characterDisplay: {},
                            buildsDisplay: {},
                        },
                        null,
                        4,
                    )
                case 'Mingyulab':
                    return JSON.stringify(convertAsMingyulab(artifacts), null, 4)
                default:
                    return JSON.stringify(convertAsMona(artifacts), null, 4)
            }
        },
        doExport(format: string) {
            clipboard.writeText(this.getExport(format))
            ElNotification({
                type: 'success',
                title: __('导出成功'),
                message: __('已复制到剪贴板'),
            })
        },
        async doExportToFile(format: string) {
            try {
                const { filePath, canceled } = await showSaveDialog({
                    title: __('导出'),
                    filters: [{ name: 'JSON Files', extensions: ['json'] }],
                })
                if (canceled || !filePath) return
                const convertedJson = this.getExport(format)
                await fsex.writeFile(filePath, convertedJson)
                ElNotification({
                    type: 'success',
                    title: __('导出成功'),
                })
            } catch (e) {
                console.log(e)
            }
        },
        doFilter() {
            if (this.isFiltering) this.isFiltering = false
            else this.showFilter = true
        },
        updateArtifactFilter(filter: ArtifactFilter) {
            this.artifactFilter = filter
            this.isFiltering = true
            this.selectedIds = []
        },
        doSelectAll() {
            this.selectedIds = []
            for (const artifact of this.list) this.selectedIds.push(artifact.id)
        },
        doLockSelected(lock: boolean) {
            const artifactLists = []
            for (const artifact of this.list) if (this.selectedIds.includes(artifact.id)) artifactLists.push(artifact)
            for (let artifact of artifactLists) artifact.lock = lock
        },
        doLoad() {
            this.selectedIds = []
            this.isFiltering = false
            loadData()
        },
        doAddFilterBatch() {
            this.filterBatch.push(new FilterBatchOne());
        },
        doDeleteFilterBatch(index: number) {
            this.filterBatch.splice(index, 1);
        },
        getFilterBatchJSON() {
            clipboard.writeText(JSON.stringify(this.filterBatch));
            ElNotification({
                type: 'success',
                title: __('导出批量过滤规则成功'),
                message: __('已复制到剪贴板'),
            })
        },
        setFilterBatchJSON() {
            try {
                if (JSON.stringify(JSON.parse(this.filterBatchSaveInput))[0] === '{') {
                    ElNotification({
                        type: 'error',
                        title: __('导入批量过滤规则失败'),
                        message: __('批量过滤规则格式错误，请检查是否输入了单条过滤规则'),
                    })
                    return;
                }
                const data = JSON.parse(this.filterBatchSaveInput);
                this.filterBatch.splice(0);
                for (let i = 0; i < data.length; i ++ )
                    this.filterBatch.push(data[i] as FilterBatchOne);
                ElNotification({
                    type: 'success',
                    title: __('导入批量过滤规则成功'),
                })
            }
            catch (e) {
                ElNotification({
                    type: 'error',
                    title: __('导入批量过滤规则失败'),
                    message: __('请检查批量规则是否为合法JSON格式'),
                })
            }
        },
        filterBatchStart() {
            console.log(this.filterBatch);
            let newLock = [];
            for (let i = 0; i < bus.artifacts.length; i ++ )
                newLock.push(bus.artifacts[i].lock);
            if (this.filterBatch.length === 0) {
                ElNotification({
                    type: 'error',
                    title: __('一条规则都没有！'),
                })
                return;
            }
            for (let i = 0; i < this.filterBatch.length; i ++ )
                if (this.filterBatch[i].filterjson === '') {
                    ElNotification({
                        type: 'error',
                        title: __('发现空规则，请先移除所有空规则'),
                    })
                    return;
                }
            for (let i = 0; i < this.filterBatch.length; i ++ ) {
                let filter = new ArtifactFilterClass();
                try {
                    filter.loadFromJSON(this.filterBatch[i].filterjson);
                }
                catch {
                    ElNotification({
                        type: 'error',
                        title: __('第') + (i + 1).toString() + __('条规则解析错误'),
                    })
                    return;
                }
                let ruleResult = [];
                for (let j = 0; j < bus.artifacts.length; j ++ )
                    if (filter.filter(bus.artifacts[j])) {
                        ruleResult.push(JSON.parse(JSON.stringify(bus.artifacts[j])));
                        newLock[j] = this.filterBatch[i].lock;
                    }
                console.log(this.filterBatch[i], ruleResult);
            }
            for (let i = 0; i < bus.artifacts.length; i ++ )
                bus.artifacts[i].lock = newLock[i];
            ElNotification({
                type: 'success',
                title: __('批量规则应用成功'),
            })
            this.isFiltering = false;
            this.showFilterBatch = false;
        }
    },
})
</script>
<template>
    <teleport to="#app-title"> {{ __('圣遗物仓库') }} </teleport>
    <teleport to="#app-actions">
        <div class="actions">
            <el-button size="mini" type="primary" plain @click="doLoad">{{ __('更新圣遗物信息') }}</el-button>
            <el-dropdown class="header-plain-dropdown" size="mini" split-button @click="doExport">
                {{ __(selectedIds.length > 0 ? '导出选中' : '导出') }}
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item disabled class="export-title">
                            {{ __('莫娜占卜铺') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="doExport('Mona')">{{ __('复制') }}</el-dropdown-item>
                        <el-dropdown-item @click="doExportToFile('Mona')">{{ __('到文件') }}</el-dropdown-item>
                        <el-dropdown-item divided disabled class="export-title">
                            {{ __('Mingyulab') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="doExport('Mingyulab')">{{ __('复制') }}</el-dropdown-item>
                        <el-dropdown-item @click="doExportToFile('Mingyulab')">{{ __('到文件') }}</el-dropdown-item>
                        <el-dropdown-item divided disabled class="export-title">
                            {{ __('Genshin Optimizer') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="doExport('GO')">{{ __('复制') }}</el-dropdown-item>
                        <el-dropdown-item @click="doExportToFile('GO')">{{ __('到文件') }}</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <el-dropdown class="header-plain-dropdown" size="mini">
                <el-button size="mini"> {{ __('操作') }}<i class="el-icon-arrow-down el-icon--right"></i> </el-button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="doSelectAll"
                            ><i class="el-icon-check"></i>{{ __('全部选择') }}</el-dropdown-item
                        >
                        <el-dropdown-item @click="selectedIds = []"
                            ><i class="el-icon-close"></i>{{ __('全部不选') }}</el-dropdown-item
                        >
                        <el-dropdown-item @click="doLockSelected(true)"
                            ><i class="el-icon-lock"></i>{{ __('加锁已选') }}</el-dropdown-item
                        >
                        <el-dropdown-item @click="doLockSelected(false)"
                            ><i class="el-icon-unlock"></i>{{ __('解锁已选') }}</el-dropdown-item
                        >
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <el-button size="mini" plain @click="doFilter">{{ __(isFiltering ? '取消过滤' : '过滤') }}</el-button>
            <el-button size="mini" plain @click="showFilterBatch = true;">
                {{ __('批量规则') }}
            </el-button>
            <template v-if="selectedIds.length <= 0">
                <el-button size="mini" plain icon="el-icon-plus" @click="doCreate">{{ __('添加') }}</el-button>
                <el-popconfirm
                    :confirmButtonText="__('确定')"
                    :cancelButtonText="__('算了')"
                    icon="el-icon-warning"
                    :title="__('真的要清空吗？')"
                    confirmButtonType="danger"
                    @confirm="doClear"
                >
                    <template #reference>
                        <el-button size="mini" type="danger" plain icon="el-icon-delete">{{ __('清空') }}</el-button>
                    </template>
                </el-popconfirm>
            </template>
            <template v-else>
                <el-button size="mini" type="danger" plain icon="el-icon-delete" @click="doDeleteSelected">
                    {{ __('删除选中') }}
                </el-button>
            </template>
        </div>
    </teleport>
    <div class="page-main">
        <el-dialog class="inputsavedialog" :title="__('批量过滤规则')" width="600px" :model-value="showFilterBatch" @update:model-value="showFilterBatch = false;">
            {{ __('批量执行过滤规则，规则会从上到下依次执行，匹配多个规则时，位于后面的规则效果会覆盖前面的规则。') }}
            {{ __('每个规则可以指定匹配上的圣遗物加锁还是解锁，过滤规则注释可选，只用于规则意义说明，没有实际效果，可以不填写。') }}
            {{ __('规则框中填写的内容为 圣遗物过滤器-保存过滤规则 按钮所导出到剪贴板的JSON字符串。') }}
            <div v-for="(filter, index) in filterBatch" :key="index">
                <hr style="border: 2px solid black;"/>
                <el-input v-model="filter.comment" size="small" :placeholder="__('过滤规则注释')">
                    <template #prepend>
                        <el-select v-model="filter.lock" style="width: 80px;">
                            <el-option :label="__('加锁')" :value="true"> </el-option>
                            <el-option :label="__('解锁')" :value="false"> </el-option>
                        </el-select>
                    </template>
                    <template #append>
                        <el-button icon="el-icon-delete-solid" @click="doDeleteFilterBatch(index)"></el-button>
                    </template>
                </el-input>
                <textarea v-model="filter.filterjson" style="width: 99%; height: 50px;"></textarea>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button size="small" style="float: left;" @click="doAddFilterBatch">{{ __('添加过滤规则') }}</el-button>
                    <el-button size="small" @click="getFilterBatchJSON">{{ __('导出批量过滤规则') }}</el-button>
                    <el-button size="small" @click="showLoadFilterBatchPanel = true;">{{ __('导入批量过滤规则') }}</el-button>
                    <el-button size="small" type="primary" @click="filterBatchStart">{{ __('批量过滤') }}</el-button>
                    <el-button size="small" @click="showFilterBatch = false;">{{ __('取消') }}</el-button>
                </span>
            </template>
            <el-dialog :title="__('输入保存数据')" width="400px" :model-value="showLoadFilterBatchPanel" @update:model-value="showLoadFilterBatchPanel = false;">
                <textarea v-model="filterBatchSaveInput" style="width: 100%; height: 100px;"></textarea>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button size="small" type="primary" @click="showLoadFilterBatchPanel = false; setFilterBatchJSON();">{{ __('确定') }}</el-button>
                        <el-button size="small" @click="showLoadFilterBatchPanel = false;">{{ __('取消') }}</el-button>
                    </span>
                </template>
            </el-dialog>
        </el-dialog>
        <artifact
            v-for="i in list"
            :key="i.id"
            :artifact="i"
            :selected="selectedIds.includes(i.id)"
            @update:selected="doSelect(i.id, $event)"
            @update:artifactlock="i.lock = $event"
            @delete="doDelete"
            @edit="doEdit"
        />
        <div v-if="list.length <= 0" class="emptyState">
            <el-empty :description="__('工作…工作还没做完…真的可以提前休息吗？')"></el-empty>
        </div>
    </div>
    <artifact-edit-panel
        v-model:show="showEdit"
        :title="__(isEdit ? '编辑圣遗物' : '添加圣遗物')"
        :model-value="editData"
        @update:model-value="doEditSave"
    />
    <artifact-filter-panel
        v-model:show="showFilter"
        v-model:filter="artifactFilter"
        :title="__('圣遗物过滤器')"
        @update:filter="updateArtifactFilter($event)"
    />
</template>

<style lang="scss" scoped>
.page-main {
    width: 100%;
    height: 100%;
}
.emptyState {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
.export-title {
    cursor: default !important;
}
</style>
