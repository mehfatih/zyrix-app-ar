import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, I18nManager, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native'
import { COLORS } from '../../constants/colors'
import { useTranslation } from '../../hooks/useTranslation'
import { expensesApi } from '../../services/api'
import KpiCard from '../../components/KpiCard'

const isRTL = I18nManager.isRTL
const CATEGORIES = ['rent','salary','supplies','marketing','utilities','other'] as const

export default function ExpensesScreen() {
  const { t } = useTranslation()
  const [data, setData] = useState<{ expenses: Array<{id:string;amount:string;currency:string;category:string;title:string;date:string}>; summary: {totalExpenses:number;totalRevenue:number;netProfit:number;byCategory:Array<{category:string;total:number;count:number}>} } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ amount: '', title: '', category: 'other' })

  const fetchData = useCallback(async () => {
    try { const res = await expensesApi.list(); setData(res) } catch (_e) {}
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.amount || !form.title) return
    setCreating(true)
    try {
      await expensesApi.create({ amount: parseFloat(form.amount), category: form.category, title: form.title })
      setShowCreate(false); setForm({ amount: '', title: '', category: 'other' }); fetchData()
    } catch (e: unknown) { Alert.alert(t('common.error'), e instanceof Error ? e.message : '') }
    setCreating(false)
  }

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>

  const summary = data?.summary
  const profitColor = (summary?.netProfit || 0) >= 0 ? COLORS.success : COLORS.danger

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
        <View style={s.header}>
          <Text style={[s.title, isRTL && s.rtl]}>{t('expenses.title')}</Text>
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Text style={s.createBtnText}>+ {t('expenses.add')}</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Summary */}
        <View style={s.kpiRow}>
          <KpiCard label={t('expenses.total_revenue')} value={`$${(summary?.totalRevenue || 0).toLocaleString()}`} color={COLORS.success} style={{flex:1}} />
          <KpiCard label={t('expenses.total_expenses')} value={`$${(summary?.totalExpenses || 0).toLocaleString()}`} color={COLORS.danger} style={{flex:1}} />
          <KpiCard label={t('expenses.net_profit')} value={`$${(summary?.netProfit || 0).toLocaleString()}`} color={profitColor} style={{flex:1}} />
        </View>

        {/* Category breakdown */}
        {summary?.byCategory && summary.byCategory.length > 0 && (
          <View style={s.catSection}>
            {summary.byCategory.map((cat, i) => (
              <View key={i} style={[s.catRow, isRTL && s.catRowRTL]}>
                <Text style={s.catName}>{t(`expenses.${cat.category}`) || cat.category}</Text>
                <Text style={s.catAmount}>${cat.total.toLocaleString()} ({cat.count})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expenses list */}
        {(!data?.expenses || data.expenses.length === 0) ? (
          <View style={s.center}><Text style={s.emptyText}>{t('expenses.no_expenses')}</Text></View>
        ) : data.expenses.map(exp => (
          <View key={exp.id} style={s.card}>
            <View style={[s.cardRow, isRTL && s.cardRowRTL]}>
              <View style={{flex:1}}>
                <Text style={s.cardTitle}>{exp.title}</Text>
                <Text style={s.cardCat}>{t(`expenses.${exp.category}`) || exp.category} · {new Date(exp.date).toLocaleDateString()}</Text>
              </View>
              <Text style={s.cardAmount}>-${Number(exp.amount).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.modalOverlay}><View style={s.modal}>
          <Text style={s.modalTitle}>{t('expenses.add')}</Text>
          <TextInput placeholder={t('expenses.title')} value={form.title} onChangeText={v=>setForm({...form,title:v})} style={s.input} placeholderTextColor={COLORS.textMuted} />
          <TextInput placeholder={t('subscriptions.amount')} value={form.amount} onChangeText={v=>setForm({...form,amount:v})} style={s.input} placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" />
          <View style={[s.catGrid, isRTL && s.catRowRTL]}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[s.catBtn, form.category === c && s.catBtnActive]} onPress={() => setForm({...form, category: c})}>
                <Text style={[s.catBtnText, form.category === c && s.catBtnTextActive]}>{t(`expenses.${c}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowCreate(false)}><Text style={{color:COLORS.textSecondary}}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={s.modalSubmit} onPress={handleCreate} disabled={creating}><Text style={{color:COLORS.white,fontWeight:'700'}}>{creating ? '...' : t('expenses.add')}</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:COLORS.deepBg},scroll:{paddingBottom:40},center:{flex:1,justifyContent:'center',alignItems:'center',padding:40},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20},
  title:{fontSize:22,fontWeight:'700',color:COLORS.textPrimary},rtl:{textAlign:'right'},
  createBtn:{backgroundColor:COLORS.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:10},
  createBtnText:{color:COLORS.white,fontSize:13,fontWeight:'600'},emptyText:{color:COLORS.textMuted,fontSize:15},
  kpiRow:{flexDirection:'row',gap:8,paddingHorizontal:16,marginBottom:16},
  catSection:{backgroundColor:COLORS.cardBg,marginHorizontal:16,marginBottom:12,borderRadius:14,borderWidth:1,borderColor:COLORS.border,padding:16},
  catRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:COLORS.divider},
  catRowRTL:{flexDirection:'row-reverse'},catName:{fontSize:14,color:COLORS.textSecondary},catAmount:{fontSize:14,fontWeight:'600',color:COLORS.textPrimary},
  card:{backgroundColor:COLORS.cardBg,marginHorizontal:16,marginBottom:8,borderRadius:12,borderWidth:1,borderColor:COLORS.border,padding:14},
  cardRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cardTitle:{fontSize:15,fontWeight:'600',color:COLORS.textPrimary,marginBottom:2},
  cardCat:{fontSize:11,color:COLORS.textMuted},cardAmount:{fontSize:16,fontWeight:'700',color:COLORS.danger},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  modal:{backgroundColor:COLORS.cardBg,borderTopLeftRadius:20,borderTopRightRadius:20,padding:24},
  modalTitle:{fontSize:20,fontWeight:'700',color:COLORS.textPrimary,marginBottom:20,textAlign:'center'},
  input:{backgroundColor:COLORS.surfaceBg,borderWidth:1,borderColor:COLORS.border,borderRadius:10,paddingHorizontal:16,paddingVertical:14,color:COLORS.textPrimary,fontSize:15,marginBottom:12},
  catGrid:{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:12},
  catBtn:{paddingHorizontal:12,paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:COLORS.border},
  catBtnActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},
  catBtnText:{fontSize:12,color:COLORS.textSecondary,fontWeight:'600'},catBtnTextActive:{color:COLORS.white},
  modalActions:{flexDirection:'row',gap:12,marginTop:8},
  modalCancel:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.surfaceBg},
  modalSubmit:{flex:1,paddingVertical:14,borderRadius:10,alignItems:'center',backgroundColor:COLORS.primary},
})
