import { Fragment, h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { ModList } from "../components/ModList";
import { getMods, Mod, SearchModResp } from "../api/xmao";
import { useCurrentEverestVersion, useGamePath } from "../states";
import "./Search.scss"
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useCallback, useRef } from "react";
import { Content, searchSubmission } from "../api/wegfan";
import { useGlobalContext } from "../App";
import { enforceEverest } from "../components/EnforceEverestPage";

const categoryIdMap = { "Assets": 15655, "Dialog": 4633, "Effects": 1501, "Helpers": 5081, "Maps": 6800, "Mechanics": 4635, "Other/Misc": 4632, "Skins": 11181, "Twitch Integration": 4636, "UI": 2317 };

export const Search = () => {
    const noEverest = enforceEverest();
    if (noEverest) return noEverest;

    const [mods, setMods] = useState<Content[]>([]);
    const [type, setType] = useState<string>("");
    const [search, setSearch] = useState<string>("");
    const selectedPath = useGamePath(v => v.gamePath);
    const [loading, setLoading] = useState(true);
    const loadingLock = useRef(false)
    const [sort, setSort] = useState<"new" | "updateAdded" | "updated" | "views" | "likes">("likes")
    const [currentPage, setCurrentPage] = useState(1);

    const fetchModPage = async (page: number) => {
        console.log("fetching", page)
        setLoading(true);
        const res = await searchSubmission({
            page,
            // @ts-ignore
            categoryId: categoryIdMap[type],
            search,
            sort,
            section: 'Mod',
            size: 25
        });
        console.log('finished, size:', res.content.length)
        setLoading(false);
        return res.content;
    }

    useEffect(() => {
        setMods([])
        setCurrentPage(1)
        fetchModPage(1).then(setMods);
    }, [type, search, sort]);

    useEffect(() => {
        loadingLock.current = false
    }, [mods])

    return <Fragment>
        <div className="filter">
            <input type="text" className="searchinput" onKeyUp={e => {
                if (e.keyCode === 257) {
                    setSearch((e.target! as any).value);
                }
            }} />
            <Button onClick={() => {
                setSearch((document.querySelector(".searchinput") as any).value);
            }}>
                <Icon name="search" />
            </Button>
            <select value={type} onChange={e => setType((e.target! as any).value)}>
                <option value="">全部</option>
                <option value="Maps">地图</option>
                <option value="Assets">资源</option>
                <option value="Effects">特效</option>
                <option value="UI">UI</option>
                <option value="Dialog">对话</option>
                <option value="Other/Misc">其他</option>
                <option value="Helpers">辅助</option>
                <option value="Skins">皮肤</option>
                <option value="Mechanics">机制</option>
                {/* <option value="Twitch Integration">Twitch整合</option> */}
            </select>
            <select value={sort} onChange={e => setSort((e.target! as any).value)}>
                <option value="new">最近发布</option>
                <option value="updateAdded">最近添加</option>
                <option value="updated">最近更新</option>
                <option value="views">最多浏览</option>
                <option value="likes">最多点赞</option>
            </select>
        </div>

        {
            mods.length > 0 ?
                mods[0] ? <ModList allowUpScroll={
                    currentPage > 1
                } loading={loading} mods={mods} onLoadMore={useCallback((type: string, visibleRange: {
                    start: number;
                    end: number;
                    colWidth: number;
                }) => new Promise(rs => {
                    console.log('load more', type)
                    const forceScroll = async (top: number) => {
                        const list = document.querySelector('.mod-list')!;
                        while (list.scrollTop !== top) {
                            list.scrollTo({
                                top: top,
                                behavior: 'instant'
                            })
                            await new Promise(rs => setTimeout(rs, 10))
                        }
                    }

                    const fadeIn = ()=>{
                        const list = document.querySelector('.mod-list')!;
                        // @ts-ignore
                        list.style.opacity = '1';
                    }

                    const fadeOut = ()=>{
                        const list = document.querySelector('.mod-list')!;
                        // @ts-ignore
                        list.style.opacity = '0';
                    }

                    if (type === 'up') {
                        if (currentPage === 1) return;
                        if (loadingLock.current) return;
                        loadingLock.current = true;
                        fadeOut();
                        setCurrentPage(v => {
                            fetchModPage(v - 1).then(newMods => {
                                if (newMods.length === 0) return;
                                setMods(newMods);
                                rs(void 0)
                                const list = document.querySelector('.mod-list')!;
                                //@ts-ignore
                                const bottomPaddingUpTop = list.scrollTop + list.lastElementChild.offsetTop - list.offsetHeight - 80
                                forceScroll(bottomPaddingUpTop).then(fadeIn)
                            })
                            return v - 1;
                        })
                    } else {
                        if (loadingLock.current) return;
                        loadingLock.current = true;
                        fadeOut();
                        setCurrentPage(v => {
                            fetchModPage(v + 1).then(newMods => {
                                if (newMods.length === 0) return;
                                setMods(newMods);
                                rs(void 0)
                                forceScroll(40).then(fadeIn)
                            })
                            return v + 1;
                        })
                    }
                }), [currentPage])} modFolder={selectedPath + "/Mods"} /> :
                    <div className="empty">加载失败，请重试</div> :
                loading ? <div className="empty"></div> :
                    <div className="empty">无内容</div>
        }

    </Fragment>;
};
